import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FISCAL_MONTH_LABELS,
  fiscalMonthOrder,
  fiscalYearLabel,
  fiscalYearToCalendarYears,
  type BudgetVsActualPoint,
  type CoalPartyTotal,
  type CoalSubcategoryTotal,
  type CommodityContribution,
  type CommodityTrend,
  type HeatmapCell,
  type KpiSnapshot,
  type MonthlyTrendPoint,
  type ParetoPoint,
  type PartnerTotal,
  type PeriodRollupRow,
  type ThroughputPoint,
  type YoyRow,
} from "./types";

export async function getKpiSnapshot(
  fiscalYear: string,
): Promise<KpiSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_executive_kpis")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    fiscal_year: data.fiscal_year,
    wagons: Number(data.wagons ?? 0),
    tonnage: Number(data.tonnage ?? 0),
    freight: Number(data.freight ?? 0),
    budget: Number(data.budget ?? 0),
    variation: Number(data.variation ?? 0),
    variation_pct:
      data.variation_pct === null ? null : Number(data.variation_pct),
  };
}

export async function getAvailableFiscalYears(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("year, month");
  if (error) throw error;
  const set = new Set<string>();
  for (const r of data ?? []) {
    set.add(fiscalYearLabel(Number(r.year), Number(r.month)));
  }
  return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

// Supabase .or() expression for "rows that belong to the given fiscal year".
// Pakistan Railways FY = Jul YYYY → Jun YYYY+1.
function fiscalYearFilter(fiscalYear: string): string {
  const { startYear, endYear } = fiscalYearToCalendarYears(fiscalYear);
  return `and(year.eq.${startYear},month.gte.7),and(year.eq.${endYear},month.lte.6)`;
}

type CommodityMonthlyRow = {
  year: number;
  month: number;
  wagons: number;
  tonnage: number;
  freight: number;
};

async function fetchCommoditySlice(
  fiscalYear: string,
): Promise<CommodityMonthlyRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("year, month, wagons, tonnage, freight")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;
  return (data ?? []).map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    wagons: Number(r.wagons ?? 0),
    tonnage: Number(r.tonnage ?? 0),
    freight: Number(r.freight ?? 0),
  }));
}

function emptyTrendPoint(year: number, month: number): MonthlyTrendPoint {
  const fm = fiscalMonthOrder(month);
  return {
    fiscalMonth: fm,
    monthLabel: FISCAL_MONTH_LABELS[fm - 1],
    year,
    month,
    wagons: 0,
    tonnage: 0,
    freight: 0,
  };
}

export async function getMonthlyTrend(
  fiscalYear: string,
): Promise<MonthlyTrendPoint[]> {
  const rows = await fetchCommoditySlice(fiscalYear);
  const buckets = new Map<string, MonthlyTrendPoint>();
  for (const r of rows) {
    const key = `${r.year}-${r.month}`;
    const entry = buckets.get(key) ?? emptyTrendPoint(r.year, r.month);
    entry.wagons += r.wagons;
    entry.tonnage += r.tonnage;
    entry.freight += r.freight;
    buckets.set(key, entry);
  }
  // Drop months where every metric aggregates to zero — these are placeholder
  // rows for the current/future month before any data is entered (ingest
  // currently inserts zeros for the current month if the xlsx cells are blank).
  return Array.from(buckets.values())
    .filter((p) => p.freight > 0 || p.wagons > 0 || p.tonnage > 0)
    .sort((a, b) => a.fiscalMonth - b.fiscalMonth);
}

export async function getCommodityContribution(
  fiscalYear: string,
): Promise<CommodityContribution[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_commodity_contribution")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("freight", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    commodity_id: Number(r.commodity_id),
    commodity: String(r.commodity),
    category: String(r.category),
    wagons: Number(r.wagons),
    tonnage: Number(r.tonnage),
    freight: Number(r.freight),
    wagon_pct: Number(r.wagon_pct),
    freight_pct: Number(r.freight_pct),
  }));
}

function emptyBudgetActualPoint(
  year: number,
  month: number,
): BudgetVsActualPoint {
  const fm = fiscalMonthOrder(month);
  return {
    fiscalMonth: fm,
    monthLabel: FISCAL_MONTH_LABELS[fm - 1],
    year,
    month,
    actual: 0,
    budget: 0,
    variance: 0,
  };
}

export async function getBudgetVsActual(
  fiscalYear: string,
): Promise<BudgetVsActualPoint[]> {
  const supabase = await createSupabaseServerClient();
  const orFilter = fiscalYearFilter(fiscalYear);

  const [{ data: actuals, error: aErr }, { data: budgets, error: bErr }] =
    await Promise.all([
      supabase
        .from("commodity_monthly")
        .select("year, month, freight")
        .or(orFilter),
      supabase
        .from("commodity_budget")
        .select("year, month, budget_freight")
        .or(orFilter),
    ]);
  if (aErr) throw aErr;
  if (bErr) throw bErr;

  const map = new Map<string, BudgetVsActualPoint>();

  for (const r of actuals ?? []) {
    const y = Number(r.year);
    const m = Number(r.month);
    const key = `${y}-${m}`;
    const entry = map.get(key) ?? emptyBudgetActualPoint(y, m);
    entry.actual += Number(r.freight ?? 0);
    map.set(key, entry);
  }
  for (const r of budgets ?? []) {
    const y = Number(r.year);
    const m = Number(r.month);
    const key = `${y}-${m}`;
    const entry = map.get(key) ?? emptyBudgetActualPoint(y, m);
    entry.budget += Number(r.budget_freight ?? 0);
    map.set(key, entry);
  }
  for (const entry of map.values()) {
    entry.variance = entry.actual - entry.budget;
  }
  return Array.from(map.values())
    .filter((p) => p.actual > 0 || p.budget > 0)
    .sort((a, b) => a.fiscalMonth - b.fiscalMonth);
}

// ─── Commodity dashboard ───────────────────────────────────────────────────

export async function getCommodityTrends(
  fiscalYear: string,
): Promise<CommodityTrend[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("commodity_id, year, month, wagons, tonnage, freight, commodities(name)")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  type Row = {
    commodity_id: number;
    year: number;
    month: number;
    wagons: number;
    tonnage: number;
    freight: number;
    commodities: { name: string } | { name: string }[] | null;
  };

  const byCommodity = new Map<number, CommodityTrend>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    const commodityName = Array.isArray(raw.commodities)
      ? raw.commodities[0]?.name
      : raw.commodities?.name;
    const id = Number(raw.commodity_id);
    if (!commodityName) continue;

    let entry = byCommodity.get(id);
    if (!entry) {
      entry = {
        commodity_id: id,
        commodity: commodityName,
        total_freight: 0,
        points: [],
      };
      byCommodity.set(id, entry);
    }

    const fm = fiscalMonthOrder(Number(raw.month));
    const freight = Number(raw.freight ?? 0);
    entry.points.push({
      fiscalMonth: fm,
      monthLabel: FISCAL_MONTH_LABELS[fm - 1],
      freight,
      wagons: Number(raw.wagons ?? 0),
      tonnage: Number(raw.tonnage ?? 0),
    });
    entry.total_freight += freight;
  }

  for (const c of byCommodity.values()) {
    c.points.sort((a, b) => a.fiscalMonth - b.fiscalMonth);
  }
  return Array.from(byCommodity.values()).sort(
    (a, b) => b.total_freight - a.total_freight,
  );
}

export async function getCommodityHeatmap(
  fiscalYear: string,
): Promise<HeatmapCell[]> {
  const trends = await getCommodityTrends(fiscalYear);
  const cells: HeatmapCell[] = [];
  for (const t of trends) {
    for (const p of t.points) {
      cells.push({
        commodity_id: t.commodity_id,
        commodity: t.commodity,
        fiscalMonth: p.fiscalMonth,
        freight: p.freight,
      });
    }
  }
  return cells;
}

// ─── Container dashboard ───────────────────────────────────────────────────

export async function getContainerPartyTotals(
  fiscalYear: string,
): Promise<PartnerTotal[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("container_party_monthly")
    .select("party_id, teus, freight, container_parties(name)")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  type Row = {
    party_id: number;
    teus: number;
    freight: number;
    container_parties: { name: string } | { name: string }[] | null;
  };

  const map = new Map<number, PartnerTotal>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    const name = Array.isArray(raw.container_parties)
      ? raw.container_parties[0]?.name
      : raw.container_parties?.name;
    if (!name) continue;
    const id = Number(raw.party_id);
    const entry = map.get(id) ?? { party_id: id, party: name, teus: 0, freight: 0 };
    entry.teus += Number(raw.teus ?? 0);
    entry.freight += Number(raw.freight ?? 0);
    map.set(id, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.freight - a.freight);
}

export async function getContainerThroughput(
  fiscalYear: string,
): Promise<ThroughputPoint[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("container_party_monthly")
    .select("year, month, teus, freight")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  const map = new Map<number, ThroughputPoint>();
  for (const r of data ?? []) {
    const fm = fiscalMonthOrder(Number(r.month));
    const entry =
      map.get(fm) ??
      {
        fiscalMonth: fm,
        monthLabel: FISCAL_MONTH_LABELS[fm - 1],
        teus: 0,
        freight: 0,
      };
    entry.teus += Number(r.teus ?? 0);
    entry.freight += Number(r.freight ?? 0);
    map.set(fm, entry);
  }
  return Array.from(map.values())
    .filter((p) => p.teus > 0 || p.freight > 0)
    .sort((a, b) => a.fiscalMonth - b.fiscalMonth);
}

// ─── Coal dashboard ────────────────────────────────────────────────────────

export async function getCoalSubcategoryTotals(
  fiscalYear: string,
): Promise<CoalSubcategoryTotal[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("commodity_id, wagons, tonnage, freight, commodities!inner(name, category)")
    .eq("commodities.category", "coal")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  type Row = {
    commodity_id: number;
    wagons: number;
    tonnage: number;
    freight: number;
    commodities: { name: string; category: string } | { name: string; category: string }[];
  };

  const map = new Map<number, CoalSubcategoryTotal>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    const name = Array.isArray(raw.commodities)
      ? raw.commodities[0]?.name
      : raw.commodities?.name;
    if (!name) continue;
    const id = Number(raw.commodity_id);
    const entry =
      map.get(id) ??
      {
        commodity_id: id,
        commodity: name,
        wagons: 0,
        tonnage: 0,
        freight: 0,
      };
    entry.wagons += Number(raw.wagons ?? 0);
    entry.tonnage += Number(raw.tonnage ?? 0);
    entry.freight += Number(raw.freight ?? 0);
    map.set(id, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.freight - a.freight);
}

export async function getCoalMonthlyTrend(
  fiscalYear: string,
): Promise<MonthlyTrendPoint[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("year, month, wagons, tonnage, freight, commodities!inner(category)")
    .eq("commodities.category", "coal")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  const buckets = new Map<string, MonthlyTrendPoint>();
  for (const r of data ?? []) {
    const y = Number(r.year);
    const m = Number(r.month);
    const key = `${y}-${m}`;
    const entry = buckets.get(key) ?? emptyTrendPoint(y, m);
    entry.wagons += Number(r.wagons ?? 0);
    entry.tonnage += Number(r.tonnage ?? 0);
    entry.freight += Number(r.freight ?? 0);
    buckets.set(key, entry);
  }
  return Array.from(buckets.values())
    .filter((p) => p.freight > 0 || p.wagons > 0 || p.tonnage > 0)
    .sort((a, b) => a.fiscalMonth - b.fiscalMonth);
}

// ─── Customer / partner dashboard ──────────────────────────────────────────

export async function getPartnerPareto(
  fiscalYear: string,
): Promise<ParetoPoint[]> {
  const partners = await getContainerPartyTotals(fiscalYear);
  const total = partners.reduce((s, p) => s + p.freight, 0);
  if (total === 0) return [];
  let running = 0;
  return partners.map((p) => {
    running += p.freight;
    return {
      party_id: p.party_id,
      party: p.party,
      freight: p.freight,
      cumulative_freight: running,
      cumulative_pct: (running / total) * 100,
    };
  });
}

// ─── Comparative dashboard ─────────────────────────────────────────────────

// Cumulative totals per commodity, Jul → cutoffFiscalMonth (inclusive) for
// the given fiscal year.
export async function getPeriodRollup(
  fiscalYear: string,
  cutoffFiscalMonth: number,
): Promise<PeriodRollupRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("commodity_id, year, month, wagons, tonnage, freight, commodities(name)")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  type Row = {
    commodity_id: number;
    year: number;
    month: number;
    wagons: number;
    tonnage: number;
    freight: number;
    commodities: { name: string } | { name: string }[] | null;
  };

  const byCommodity = new Map<number, PeriodRollupRow>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    if (fiscalMonthOrder(Number(raw.month)) > cutoffFiscalMonth) continue;
    const id = Number(raw.commodity_id);
    const name = Array.isArray(raw.commodities)
      ? raw.commodities[0]?.name
      : raw.commodities?.name;
    if (!name) continue;
    const entry =
      byCommodity.get(id) ??
      {
        commodity_id: id,
        commodity: name,
        wagons: 0,
        tonnage: 0,
        freight: 0,
      };
    entry.wagons += Number(raw.wagons ?? 0);
    entry.tonnage += Number(raw.tonnage ?? 0);
    entry.freight += Number(raw.freight ?? 0);
    byCommodity.set(id, entry);
  }
  return Array.from(byCommodity.values()).sort(
    (a, b) => b.freight - a.freight,
  );
}

// Full-period YoY: current FY vs prior FY (Jul-Apr aggregate from
// comparative_yearly). Returns one row per commodity that appears in
// either period.
export async function getYoyComparison(
  currentFy: string,
  priorFy: string,
): Promise<YoyRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comparative_yearly")
    .select("commodity_id, fiscal_year, wagons, tonnage, freight, commodities(name)")
    .in("fiscal_year", [currentFy, priorFy]);
  if (error) throw error;

  type Row = {
    commodity_id: number;
    fiscal_year: string;
    wagons: number;
    tonnage: number;
    freight: number;
    commodities: { name: string } | { name: string }[] | null;
  };

  const map = new Map<number, YoyRow>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    const id = Number(raw.commodity_id);
    const name = Array.isArray(raw.commodities)
      ? raw.commodities[0]?.name
      : raw.commodities?.name;
    if (!name) continue;

    let entry = map.get(id);
    if (!entry) {
      entry = {
        commodity_id: id,
        commodity: name,
        current_wagons: 0,
        current_tonnage: 0,
        current_freight: 0,
        prior_wagons: 0,
        prior_tonnage: 0,
        prior_freight: 0,
        wagons_delta: 0,
        tonnage_delta: 0,
        freight_delta: 0,
        freight_delta_pct: null,
      };
      map.set(id, entry);
    }
    if (raw.fiscal_year === currentFy) {
      entry.current_wagons += Number(raw.wagons ?? 0);
      entry.current_tonnage += Number(raw.tonnage ?? 0);
      entry.current_freight += Number(raw.freight ?? 0);
    } else {
      entry.prior_wagons += Number(raw.wagons ?? 0);
      entry.prior_tonnage += Number(raw.tonnage ?? 0);
      entry.prior_freight += Number(raw.freight ?? 0);
    }
  }

  for (const r of map.values()) {
    r.wagons_delta = r.current_wagons - r.prior_wagons;
    r.tonnage_delta = r.current_tonnage - r.prior_tonnage;
    r.freight_delta = r.current_freight - r.prior_freight;
    r.freight_delta_pct =
      r.prior_freight > 0
        ? (r.freight_delta / r.prior_freight) * 100
        : null;
  }
  return Array.from(map.values()).sort(
    (a, b) => Math.abs(b.freight_delta) - Math.abs(a.freight_delta),
  );
}

// Highest fiscal-month index (1..12, Jul=1) with non-zero freight in the
// given fiscal year. Used to bound the cutoff-month selector so users
// can't pick a month that has no data.
export async function getLatestFiscalMonth(fiscalYear: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commodity_monthly")
    .select("month, freight")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;
  let max = 1;
  for (const r of data ?? []) {
    if (Number(r.freight ?? 0) === 0) continue;
    const fm = fiscalMonthOrder(Number(r.month));
    if (fm > max) max = fm;
  }
  return max;
}

// Fiscal years that have comparative_yearly data — used to populate the
// prior-year choice for the YoY view.
export async function getComparativeFiscalYears(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comparative_yearly")
    .select("fiscal_year");
  if (error) throw error;
  const set = new Set<string>();
  for (const r of data ?? []) set.add(String(r.fiscal_year));
  return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

export async function getCoalPartyTotals(
  fiscalYear: string,
): Promise<CoalPartyTotal[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("coal_party_monthly")
    .select("party_id, wagons, tonnage, freight, coal_parties(name)")
    .or(fiscalYearFilter(fiscalYear));
  if (error) throw error;

  type Row = {
    party_id: number;
    wagons: number;
    tonnage: number | null;
    freight: number | null;
    coal_parties: { name: string } | { name: string }[] | null;
  };

  const map = new Map<number, CoalPartyTotal>();
  for (const raw of (data ?? []) as unknown as Row[]) {
    const name = Array.isArray(raw.coal_parties)
      ? raw.coal_parties[0]?.name
      : raw.coal_parties?.name;
    if (!name) continue;
    const id = Number(raw.party_id);
    const entry =
      map.get(id) ??
      {
        party_id: id,
        party: name,
        wagons: 0,
        tonnage: null as number | null,
        freight: null as number | null,
      };
    entry.wagons += Number(raw.wagons ?? 0);
    if (raw.tonnage !== null && raw.tonnage !== undefined) {
      entry.tonnage = (entry.tonnage ?? 0) + Number(raw.tonnage);
    }
    if (raw.freight !== null && raw.freight !== undefined) {
      entry.freight = (entry.freight ?? 0) + Number(raw.freight);
    }
    map.set(id, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.wagons - a.wagons);
}
