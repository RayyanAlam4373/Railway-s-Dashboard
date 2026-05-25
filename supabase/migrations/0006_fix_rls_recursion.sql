-- Phase 2 hotfix — RLS recursion on public.profiles.
--
-- The admin SELECT/UPDATE policies on public.profiles (migration 0001) and
-- the helpers can_write_facts / can_delete_facts (migration 0003) all
-- queried public.profiles from inside a policy USING/WITH CHECK clause.
-- Because those clauses were themselves evaluated through profiles' RLS,
-- Postgres raised:
--   42P17 — infinite recursion detected in policy for relation "profiles"
-- which blocked every signed-in request that needed to read profiles
-- (i.e. all of them, via requireSession()).
--
-- Fix: route every "does the calling user have role X" check through a
-- SECURITY DEFINER function. SECURITY DEFINER runs with the function
-- owner's privileges (postgres, which has BYPASSRLS), so the inner SELECT
-- doesn't trip RLS on the way back through profiles.

create or replace function public.has_any_role(
  check_roles public.user_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(check_roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin']::public.user_role[]);
$$;

-- Replace the recursive variants from migration 0003.
create or replace function public.can_write_facts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(
    array['admin', 'ops_manager', 'data_entry']::public.user_role[]
  );
$$;

create or replace function public.can_delete_facts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin']::public.user_role[]);
$$;

-- ── profiles: drop the recursive policies, recreate via is_admin() ──────────
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- The simpler update-self WITH CHECK above doesn't restrict the `role`
-- column, so a self-update could escalate. Block role changes from
-- non-admins via a trigger.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admins can change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_trigger on public.profiles;
create trigger profiles_guard_role_trigger
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ── Lookup tables: rewire admin write policies to is_admin() ────────────────
drop policy if exists "commodities_write_admin" on public.commodities;
create policy "commodities_write_admin"
  on public.commodities for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "container_parties_write_admin" on public.container_parties;
create policy "container_parties_write_admin"
  on public.container_parties for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coal_parties_write_admin" on public.coal_parties;
create policy "coal_parties_write_admin"
  on public.coal_parties for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cargo_express_routes_write_admin"
  on public.cargo_express_routes;
create policy "cargo_express_routes_write_admin"
  on public.cargo_express_routes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Audit log read policy ───────────────────────────────────────────────────
drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
  on public.audit_log for select
  using (
    public.has_any_role(array['admin', 'auditor']::public.user_role[])
  );
