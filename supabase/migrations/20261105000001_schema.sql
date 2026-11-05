-- Мини-CRM «Объекты и задачи»: схема, RLS, переходы статусов.

create type public.user_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'in_review', 'done', 'rework');

-- ───────────── Таблицы ─────────────

create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role      public.user_role not null
);

create table public.objects (
  id      uuid primary key default gen_random_uuid(),
  name    text not null check (length(btrim(name)) > 0),
  address text not null check (length(btrim(address)) > 0)
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(btrim(title)) > 0),
  description text not null default '',
  object_id   uuid not null references public.objects (id) on delete restrict,
  assignee_id uuid not null references public.profiles (id) on delete restrict,
  status      public.task_status not null default 'new',
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table public.task_history (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status   public.task_status not null,
  changed_by  uuid not null references public.profiles (id) on delete restrict,
  comment     text,
  created_at  timestamptz not null default now()
);

create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_object_idx on public.tasks (object_id);
create index task_history_task_idx on public.task_history (task_id, created_at);

-- ───────────── Хелпер роли ─────────────
-- security definer, чтобы политики не уходили в рекурсию через RLS на profiles.

create function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- ───────────── Привилегии ─────────────
-- Supabase по умолчанию выдаёт anon/authenticated полный доступ: снимаем всё и выдаём точечно.

revoke all on public.profiles, public.objects, public.tasks, public.task_history from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.objects to authenticated;
grant select on public.task_history to authenticated;
grant select on public.tasks to authenticated;

grant insert (name, address), update (name, address), delete on public.objects to authenticated;

-- status, author_id, created_at клиент менять не может: статус только через RPC,
-- автор берётся из auth.uid() по умолчанию.
grant insert (title, description, object_id, assignee_id) on public.tasks to authenticated;
grant update (title, description, object_id, assignee_id) on public.tasks to authenticated;
grant delete on public.tasks to authenticated;

revoke execute on function public.is_manager() from public, anon;
grant execute on function public.is_manager() to authenticated;

-- ───────────── RLS ─────────────

alter table public.profiles     enable row level security;
alter table public.objects      enable row level security;
alter table public.tasks        enable row level security;
alter table public.task_history enable row level security;

-- profiles: читают все вошедшие (нужны имена в интерфейсе), писать нельзя никому.
create policy profiles_select on public.profiles
  for select to authenticated using (true);

-- objects
create policy objects_select on public.objects
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id and t.assignee_id = auth.uid()
    )
  );
create policy objects_insert on public.objects
  for insert to authenticated with check (public.is_manager());
create policy objects_update on public.objects
  for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy objects_delete on public.objects
  for delete to authenticated using (public.is_manager());

-- tasks
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_manager() or assignee_id = auth.uid());
create policy tasks_insert on public.tasks
  for insert to authenticated with check (public.is_manager());
create policy tasks_update on public.tasks
  for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.is_manager());

-- task_history: только чтение, и только по доступным задачам.
create policy task_history_select on public.task_history
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.id = task_history.task_id and t.assignee_id = auth.uid()
    )
  );

-- ───────────── Триггеры на tasks ─────────────

-- Исполнитель задачи должен быть исполнителем по роли; у принятой задачи его менять нельзя.
create function public.tasks_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id then
    if not exists (
      select 1 from public.profiles where id = new.assignee_id and role = 'executor'
    ) then
      raise exception 'Assignee must be an executor' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'done'
     and new.assignee_id is distinct from old.assignee_id then
    raise exception 'Cannot reassign an accepted task' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tasks_validate_trg
  before insert or update on public.tasks
  for each row execute function public.tasks_validate();

-- Запись о создании задачи (— → Новая).
create function public.tasks_log_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.author_id);
  return new;
end;
$$;

create trigger tasks_log_creation_trg
  after insert on public.tasks
  for each row execute function public.tasks_log_creation();

revoke execute on function public.tasks_validate(), public.tasks_log_creation()
  from public, anon, authenticated;

-- ───────────── Смена статуса ─────────────

create function public.change_task_status(
  p_task_id    uuid,
  p_new_status public.task_status,
  p_comment    text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_task    public.tasks;
  v_manager boolean;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_old_status public.task_status;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_manager := public.is_manager();

  select * into v_task from public.tasks where id = p_task_id for update;

  -- Чужую задачу исполнитель «не видит»: тот же ответ, что и для несуществующей.
  if not found or (not v_manager and v_task.assignee_id <> v_uid) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if (v_task.status, p_new_status) in (
       ('new', 'in_progress'), ('in_progress', 'in_review'), ('rework', 'in_progress')) then
    -- действие назначенного исполнителя
    if v_task.assignee_id <> v_uid or v_manager then
      raise exception 'Only the assignee can do this transition' using errcode = '42501';
    end if;
  elsif (v_task.status, p_new_status) in (('in_review', 'done'), ('in_review', 'rework')) then
    -- действие постановщика
    if not v_manager then
      raise exception 'Only a manager can do this transition' using errcode = '42501';
    end if;
    if p_new_status = 'rework' and v_comment is null then
      raise exception 'Comment is required when returning for rework' using errcode = '23514';
    end if;
  else
    raise exception 'Transition % -> % is not allowed', v_task.status, p_new_status
      using errcode = '23514';
  end if;

  v_old_status := v_task.status;

  update public.tasks set status = p_new_status where id = p_task_id
  returning * into v_task;

  insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_old_status, p_new_status, v_uid, v_comment);

  return v_task;
end;
$$;

revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
