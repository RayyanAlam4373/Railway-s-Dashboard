-- Phase 1 — lookup tables for the six datasets.
-- Names here are CANONICAL. The ingestion script (scripts/ingest-xlsx.ts)
-- carries the alias map from the xlsx files' spelling variants to these
-- canonical names, so this table never holds typos.

create table public.commodities (
  id bigserial primary key,
  name text not null unique,
  category text not null check (category in ('oil', 'fertilizer', 'mineral', 'coal', 'container', 'cargo_express', 'agricultural', 'industrial', 'other')),
  display_order int not null default 999,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index commodities_active_idx on public.commodities (active, display_order);

create table public.container_parties (
  id bigserial primary key,
  name text not null unique,
  agreement_terms text,
  active boolean not null default true,
  display_order int not null default 999,
  created_at timestamptz not null default now()
);

create index container_parties_active_idx on public.container_parties (active, display_order);

create table public.coal_parties (
  id bigserial primary key,
  name text not null unique,
  active boolean not null default true,
  display_order int not null default 999,
  created_at timestamptz not null default now()
);

create index coal_parties_active_idx on public.coal_parties (active, display_order);

create table public.cargo_express_routes (
  id bigserial primary key,
  code text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: lookups are readable by any signed-in user; only admins can modify.
alter table public.commodities enable row level security;
alter table public.container_parties enable row level security;
alter table public.coal_parties enable row level security;
alter table public.cargo_express_routes enable row level security;

create policy "commodities_read_authenticated"
  on public.commodities for select
  to authenticated using (true);

create policy "commodities_write_admin"
  on public.commodities for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "container_parties_read_authenticated"
  on public.container_parties for select
  to authenticated using (true);

create policy "container_parties_write_admin"
  on public.container_parties for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "coal_parties_read_authenticated"
  on public.coal_parties for select
  to authenticated using (true);

create policy "coal_parties_write_admin"
  on public.coal_parties for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "cargo_express_routes_read_authenticated"
  on public.cargo_express_routes for select
  to authenticated using (true);

create policy "cargo_express_routes_write_admin"
  on public.cargo_express_routes for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
