-- Тестовые данные. Выполнять в Supabase SQL Editor ПОСЛЕ миграции (выполняется от владельца, RLS обходится).
-- Пароли тестовые, только для демо.
--   manager@example.com   / Manager123!
--   executor1@example.com / Executor123!
--   executor2@example.com / Executor123!

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-0000000000a1'::uuid, 'manager@example.com',   'Manager123!',  'Анна Руководителева', 'manager'::public.user_role),
      ('00000000-0000-0000-0000-0000000000b1'::uuid, 'executor1@example.com', 'Executor123!', 'Иван Прорабов',       'executor'::public.user_role),
      ('00000000-0000-0000-0000-0000000000b2'::uuid, 'executor2@example.com', 'Executor123!', 'Пётр Бетонов',        'executor'::public.user_role)
    ) as t(id, email, pwd, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt(u.pwd, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    ) on conflict do nothing;

    insert into public.profiles (id, full_name, role)
    values (u.id, u.full_name, u.role)
    on conflict (id) do nothing;
  end loop;
end $$;

insert into public.objects (id, name, address) values
  ('00000000-0000-0000-0000-0000000000c1', 'ЖК «Северный»',      'г. Москва, ул. Северная, 12'),
  ('00000000-0000-0000-0000-0000000000c2', 'Складской комплекс', 'г. Тверь, Промзона, участок 5'),
  ('00000000-0000-0000-0000-0000000000c3', 'Коттедж на Озёрной', 'г. Химки, ул. Озёрная, 7')
on conflict (id) do nothing;

-- Задачи создаются как «Новая» (триггер пишет первую запись истории), затем статус и история
-- доводятся вручную до нужного состояния.
insert into public.tasks (id, title, description, object_id, assignee_id, author_id) values
  ('00000000-0000-0000-0000-0000000000d1', 'Залить фундамент',        'Секция А, бетон B25',               '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d2', 'Монтаж арматуры',         'Секция Б',                          '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d3', 'Кладка наружных стен',    '1-й этаж, газобетон',               '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', 'Прокладка электрики',     'Щитовая и магистрали',              '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d5', 'Кровельные работы',       'Монтаж стропил и профнастила',      '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d6', 'Отделка фасада',          'Штукатурка, покраска',              '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

-- Статусы и история доводятся один раз: если переходы уже есть, повторный запуск ничего не меняет.
-- Даты заданы явно, иначе все записи получили бы одинаковый now() и порядок истории стал бы случайным.
do $$
begin
  if exists (select 1 from public.task_history where to_status <> 'new') then
    return;
  end if;

  update public.task_history set created_at = now() - interval '7 days' where from_status is null;

  -- d1: В работе
  update public.tasks set status = 'in_progress' where id = '00000000-0000-0000-0000-0000000000d1';
  insert into public.task_history (task_id, from_status, to_status, changed_by, created_at) values
    ('00000000-0000-0000-0000-0000000000d1', 'new', 'in_progress', '00000000-0000-0000-0000-0000000000b1', now() - interval '6 days');

  -- d2: Новая (без изменений)

  -- d3: На проверке
  update public.tasks set status = 'in_review' where id = '00000000-0000-0000-0000-0000000000d3';
  insert into public.task_history (task_id, from_status, to_status, changed_by, created_at) values
    ('00000000-0000-0000-0000-0000000000d3', 'new', 'in_progress', '00000000-0000-0000-0000-0000000000b2', now() - interval '6 days'),
    ('00000000-0000-0000-0000-0000000000d3', 'in_progress', 'in_review', '00000000-0000-0000-0000-0000000000b2', now() - interval '3 days');

  -- d4: На доработке
  update public.tasks set status = 'rework' where id = '00000000-0000-0000-0000-0000000000d4';
  insert into public.task_history (task_id, from_status, to_status, changed_by, comment, created_at) values
    ('00000000-0000-0000-0000-0000000000d4', 'new', 'in_progress', '00000000-0000-0000-0000-0000000000b2', null, now() - interval '6 days'),
    ('00000000-0000-0000-0000-0000000000d4', 'in_progress', 'in_review', '00000000-0000-0000-0000-0000000000b2', null, now() - interval '4 days'),
    ('00000000-0000-0000-0000-0000000000d4', 'in_review', 'rework', '00000000-0000-0000-0000-0000000000a1', 'Не хватает схемы разводки, приложите.', now() - interval '2 days');

  -- d5: Принята
  update public.tasks set status = 'done' where id = '00000000-0000-0000-0000-0000000000d5';
  insert into public.task_history (task_id, from_status, to_status, changed_by, created_at) values
    ('00000000-0000-0000-0000-0000000000d5', 'new', 'in_progress', '00000000-0000-0000-0000-0000000000b1', now() - interval '6 days'),
    ('00000000-0000-0000-0000-0000000000d5', 'in_progress', 'in_review', '00000000-0000-0000-0000-0000000000b1', now() - interval '4 days'),
    ('00000000-0000-0000-0000-0000000000d5', 'in_review', 'done', '00000000-0000-0000-0000-0000000000a1', now() - interval '1 day');

  -- d6: Новая (без изменений)
end $$;
