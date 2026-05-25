-- Phase 0 — Profiles table + RBAC scaffolding.
-- Fact tables and views are added in later phases.

create type public.user_role as enum (
  'admin',
  'executive',
  'ops_manager',
  'analyst',
  'data_entry',
  'auditor'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  role public.user_role not null default 'auditor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Auto-create a profile row on user signup. New users land as 'auditor';
-- an admin promotes them via the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Touch updated_at on profile updates.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS: a signed-in user can read/update their own profile.
-- Admins (role = 'admin') can read/update any profile — used in Phase 0
-- for the first promotion and later for user management UIs.
alter table public.profiles enable row level security;

create policy "profiles_select_self"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "profiles_update_self"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_update_admin"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Audit log (used by every CRUD action in Phase 2 onwards).
create table public.audit_log (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  diff jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_table_idx on public.audit_log (table_name, created_at desc);
create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin"
  on public.audit_log
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'auditor')
    )
  );
