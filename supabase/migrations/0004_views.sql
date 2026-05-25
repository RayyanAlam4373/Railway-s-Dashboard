-- Phase 1 — read-only views used by dashboards.
-- These replace the precomputed totals/percentages in the source xlsx
-- (Findings #5 and #9), so the numbers never drift when records are added.

-- Pakistan Railways fiscal year runs Jul -> Jun. Helper turns a calendar
-- (year, month) into a fiscal-year label like '2025-2026'.
create or replace function public.fiscal_year_label(p_year int, p_month int)
returns text
language sql
immutable
as $$
  select case
    when p_month >= 7 then format('%s-%s', p_year, p_year + 1)
    else format('%s-%s', p_year - 1, p_year)
  end;
$$;

-- Fiscal month ordering: Jul=1, Aug=2, ..., Jun=12. Useful for sorting in dashboards.
create or replace function public.fiscal_month_order(p_month int)
returns int
language sql
immutable
as $$
  select case
    when p_month >= 7 then p_month - 6
    else p_month + 6
  end;
$$;

-- Commodity totals per fiscal year, with shares of total. Replaces the
-- Percentage Contribution.xlsx file (Finding #9).
create or replace view public.v_commodity_contribution as
with totals as (
  select
    public.fiscal_year_label(year, month) as fiscal_year,
    commodity_id,
    sum(wagons) as wagons,
    sum(tonnage) as tonnage,
    sum(freight) as freight
  from public.commodity_monthly
  group by 1, 2
),
fy_totals as (
  select fiscal_year, sum(wagons) as total_wagons, sum(freight) as total_freight
  from totals
  group by 1
)
select
  t.fiscal_year,
  c.id as commodity_id,
  c.name as commodity,
  c.category,
  t.wagons,
  t.tonnage,
  t.freight,
  case when ft.total_wagons > 0 then round((t.wagons::numeric / ft.total_wagons) * 100, 4) else 0 end as wagon_pct,
  case when ft.total_freight > 0 then round((t.freight / ft.total_freight) * 100, 4) else 0 end as freight_pct
from totals t
join public.commodities c on c.id = t.commodity_id
join fy_totals ft on ft.fiscal_year = t.fiscal_year;

-- Period comparison: for any fiscal-year window (Jul through some cutoff
-- month), totals per commodity. Used by the comparative dashboard
-- (replaces the 6 redundant sheets in JUL-APR Comparative.xlsx, Finding #5).
create or replace view public.v_period_comparison as
with monthly_with_fy as (
  select
    public.fiscal_year_label(year, month) as fiscal_year,
    public.fiscal_month_order(month) as fy_month_order,
    month,
    commodity_id,
    wagons,
    tonnage,
    freight
  from public.commodity_monthly
)
select
  fiscal_year,
  fy_month_order as period_through_fy_month,
  month as period_through_calendar_month,
  commodity_id,
  sum(wagons) as wagons,
  sum(tonnage) as tonnage,
  sum(freight) as freight
from monthly_with_fy m1
where exists (
  select 1 from monthly_with_fy m2
  where m2.fiscal_year = m1.fiscal_year
    and m2.fy_month_order >= m1.fy_month_order
)
group by fiscal_year, fy_month_order, month, commodity_id;

-- Executive KPIs: top-level totals for the dashboard header cards.
create or replace view public.v_executive_kpis as
with monthly as (
  select
    public.fiscal_year_label(year, month) as fiscal_year,
    sum(wagons) as wagons,
    sum(tonnage) as tonnage,
    sum(freight) as freight
  from public.commodity_monthly
  group by 1
),
budget as (
  select
    public.fiscal_year_label(year, month) as fiscal_year,
    sum(budget_freight) as budget
  from public.commodity_budget
  group by 1
)
select
  m.fiscal_year,
  m.wagons,
  m.tonnage,
  m.freight,
  coalesce(b.budget, 0) as budget,
  coalesce(m.freight - b.budget, 0) as variation,
  case when coalesce(b.budget, 0) > 0
    then round(((m.freight - b.budget) / b.budget) * 100, 4)
    else null
  end as variation_pct
from monthly m
left join budget b on b.fiscal_year = m.fiscal_year;
