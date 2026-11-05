# Мини-CRM «Объекты и задачи»

React + TypeScript (Vite) и Supabase (Auth, Postgres, RLS). Постановщик ставит задачи по объектам, исполнитель берёт их в работу и отправляет на проверку.

Подробнее: [EXPLAINER.md](EXPLAINER.md) (как устроена система, для руководителя), [DECISIONS.md](DECISIONS.md) (решения и допущения).

## Запуск

### 1. База (Supabase)
1. Создайте проект на supabase.com (бесплатный тариф).
2. **Authentication → Sign In / Providers → Email**: выключите *Allow new users to sign up*.
3. **SQL Editor**: выполните по очереди
   - `supabase/migrations/20261105000001_schema.sql`
   - `supabase/seed.sql` (тестовые пользователи, 3 объекта, 6 задач в разных статусах; можно запускать повторно).
4. **Project Settings → API**: возьмите *Project URL* и ключ *anon public*. Ключ `service_role` никуда не вносить.

### 2. Фронтенд
```bash
cp .env.example .env     # заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm install
npm run dev              # разработка
npm run build            # production-сборка в dist/
```

### 3. Деплой (Vercel)
Импортируйте репозиторий, задайте те же две переменные окружения. `vercel.json` уже содержит перенаправление для SPA.

## Тестовые пользователи

| Роль | Email | Пароль |
|---|---|---|
| Постановщик | manager@example.com | Manager123! |
| Исполнитель 1 | executor1@example.com | Executor123! |
| Исполнитель 2 | executor2@example.com | Executor123! |

Новых пользователей создают вручную: Authentication → Users → Add user, затем строка в `public.profiles` (`id` пользователя, `full_name`, `role`).

## Структура
- `supabase/migrations/` — схема, права, RLS, триггеры, функция смены статуса.
- `supabase/seed.sql` — тестовые данные.
- `src/lib/` — клиент Supabase, типы, таблица переходов статусов, авторизация.
- `src/pages/`, `src/components/` — экраны и компоненты.
- `AGENTS.md`, `CLAUDE.md` — роли агентов и журнал разработки.

## Безопасность в двух словах
- Права закрыты на уровне базы (RLS и права на колонки), а не в интерфейсе.
- Статус задачи меняется только функцией `change_task_status`, которая проверяет роль, исполнителя и допустимость перехода.
- История статусов доступна клиентам только на чтение.
- Во фронтенде только публичный `anon`-ключ.
