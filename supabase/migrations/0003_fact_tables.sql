-- Phase 1 — fact tables, one row per observation.
-- Wide xlsx layouts are normalized to long (entity, year, month, metrics)
-- by scripts/ingest-xlsx.ts.

-- Helper: fiscal-year month order (Jul=1 ... Jun=12) used by sorting/views.
-- Stored as plain int 1..12 (calendar month). Fiscal ordering is handled in views.

create table public.commodity_monthly (
  id bigserial primary key,
  commodity_id bigint not null references public.commodities (id) on delete restrict,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  wagons int not null default 0 check (wagons >= 0),
  tonnage numeric(14, 2) not null default 0 check (tonnage >= 0),
  freight numeric(14, 3) not null default 0 check (freight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commodity_id, year, month)
);

create index commodity_monthly_year_month_idx on public.commodity_monthly (year, month);
create index commodity_monthly_commodity_idx on public.commodity_monthly (commodity_id);

create trigger commodity_monthly_set_updated_at
  before update on public.commodity_monthly
  for each row execute function public.touch_updated_at();

create table public.commodity_budget (
  id bigserial primary key,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  budget_freight numeric(14, 3) not null check (budget_freight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month)
);

create trigger commodity_budget_set_updated_at
  before update on public.commodity_budget
  for each row execute function public.touch_updated_at();

create table public.cargo_express_monthly (
  id bigserial primary key,
  route_id bigint not null references public.cargo_express_routes (id) on delete restrict,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  wagons int not null default 0 check (wagons >= 0),
  earning numeric(14, 3) not null default 0 check (earning >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, year, month)
);

create index cargo_express_monthly_year_month_idx on public.cargo_express_monthly (year, month);

create trigger cargo_express_monthly_set_updated_at
  before update on public.cargo_express_monthly
  for each row execute function public.touch_updated_at();

create table public.coal_party_monthly (
  id bigserial primary key,
  party_id bigint not null references public.coal_parties (id) on delete restrict,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  wagons int not null default 0 check (wagons >= 0),
  -- Tonnage & freight are NULLABLE because the source xlsx (Finding #1)
  -- has Wagon only. Once the client backfills the remaining two columns
  -- the form/ingest will populate them.
  tonnage numeric(14, 2) check (tonnage is null or tonnage >= 0),
  freight numeric(14, 3) check (freight is null or freight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (party_id, year, month)
);

create index coal_party_monthly_year_month_idx on public.coal_party_monthly (year, month);
create index coal_party_monthly_party_idx on public.coal_party_monthly (party_id);

create trigger coal_party_monthly_set_updated_at
  before update on public.coal_party_monthly
  for each row execute function public.touch_updated_at();

create table public.container_party_monthly (
  id bigserial primary key,
  party_id bigint not null references public.container_parties (id) on delete restrict,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  teus numeric(12, 2) not null default 0 check (teus >= 0),
  freight numeric(14, 3) not null default 0 check (freight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (party_id, year, month)
);

create index container_party_monthly_year_month_idx on public.container_party_monthly (year, month);
create index container_party_monthly_party_idx on public.container_party_monthly (party_id);

create trigger container_party_monthly_set_updated_at
  before update on public.container_party_monthly
  for each row execute function public.touch_updated_at();

-- comparative_yearly stores prior-period aggregates that aren't broken out
-- by month in the source files (e.g., the 2024-2025 JUL-APR totals).
-- The current period can also be ingested here for convenience; the views
-- reconcile across both sources.
--
-- fiscal_year format: "2024-2025" (string, sorts lexically).
create table public.comparative_yearly (
  id bigserial primary key,
  commodity_id bigint not null references public.commodities (id) on delete restrict,
  fiscal_year text not null check (fiscal_year ~ '^\d{4}-\d{4}$'),
  period_start_month int not null check (period_start_month between 1 and 12),
  period_end_month int not null check (period_end_month between 1 and 12),
  wagons int not null default 0 check (wagons >= 0),
  tonnage numeric(14, 2) not null default 0 check (tonnage >= 0),
  freight numeric(14, 3) not null default 0 check (freight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commodity_id, fiscal_year, period_start_month, period_end_month)
);

create index comparative_yearly_fy_idx on public.comparative_yearly (fiscal_year);

create trigger comparative_yearly_set_updated_at
  before update on public.comparative_yearly
  for each row execute function public.touch_updated_at();

-- RLS: signed-in users can read; data_entry/ops_manager/admin can write.
-- Audit logging is performed in the application layer (server actions).

alter table public.commodity_monthly enable row level security;
alter table public.commodity_budget enable row level security;
alter table public.cargo_express_monthly enable row level security;
alter table public.coal_party_monthly enable row level security;
alter table public.container_party_monthly enable row level security;
alter table public.comparative_yearly enable row level security;

create or replace function public.can_write_facts()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'ops_manager', 'data_entry')
  );
$$;

create or replace function public.can_delete_facts()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Same policy shape for every fact table.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'commodity_monthly', 'commodity_budget', 'cargo_express_monthly',
    'coal_party_monthly', 'container_party_monthly', 'comparative_yearly'
  ])
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_read_authenticated', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.can_write_facts());',
      t || '_insert_writers', t
    );
    execute format(
      'create policy %I on public.%I for update using (public.can_write_facts()) with check (public.can_write_facts());',
      t || '_update_writers', t
    );
    execute format(
      'create policy %I on public.%I for delete using (public.can_delete_facts());',
      t || '_delete_admin', t
    );
  end loop;
end$$;
