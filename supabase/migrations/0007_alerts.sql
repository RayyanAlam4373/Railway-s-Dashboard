-- Phase 7 — alerts table.
-- The evaluator (apps/web/src/lib/alerts/evaluate.ts) computes potential
-- alerts from current data and upserts on `fingerprint`. The fingerprint
-- represents an "incident" (e.g. revenue_drop:2025-11) so re-running the
-- evaluator never duplicates an existing alert.

create type public.alert_type as enum (
  'revenue_drop',
  'budget_variance',
  'partner_concentration'
);

create type public.alert_severity as enum ('info', 'warning', 'critical');

create table public.alerts (
  id bigserial primary key,
  type public.alert_type not null,
  severity public.alert_severity not null,
  title text not null,
  message text not null,
  scope jsonb not null default '{}'::jsonb,
  fingerprint text not null unique,
  acknowledged_by uuid references auth.users (id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alerts_active_idx
  on public.alerts (created_at desc)
  where acknowledged_at is null;

create index alerts_type_idx on public.alerts (type, created_at desc);

create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function public.touch_updated_at();

alter table public.alerts enable row level security;

-- Any signed-in user can read active alerts and acknowledge them.
create policy "alerts_select_authenticated"
  on public.alerts
  for select
  to authenticated
  using (true);

-- Acknowledging is an UPDATE that sets acknowledged_by / acknowledged_at.
-- Writers (admin, ops_manager, data_entry) can acknowledge.
create policy "alerts_update_writers"
  on public.alerts
  for update
  using (public.can_write_facts())
  with check (public.can_write_facts());

-- Inserts are performed via the application server actions using the
-- user's session — only writers are allowed (the evaluator runs on demand
-- from the alerts page, which is gated by role at the UI layer).
create policy "alerts_insert_writers"
  on public.alerts
  for insert
  with check (public.can_write_facts());

-- Only admins can purge alerts; otherwise rely on acknowledge.
create policy "alerts_delete_admin"
  on public.alerts
  for delete
  using (public.is_admin());
