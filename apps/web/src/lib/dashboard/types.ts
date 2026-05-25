// Pakistan Railways fiscal year runs Jul → Jun.
import { MONTH_NAMES } from "@/lib/datasets/registry";

export function fiscalYearLabel(year: number, month: number): string {
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function fiscalMonthOrder(month: number): number {
  return month >= 7 ? month - 6 : month + 6;
}

export function calendarMonthFromFiscal(fiscalMonth: number): number {
  return fiscalMonth <= 6 ? fiscalMonth + 6 : fiscalMonth - 6;
}

export const FISCAL_MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  MONTH_NAMES[calendarMonthFromFiscal(i + 1) - 1],
);

export function fiscalYearToCalendarYears(fiscalYear: string): {
  startYear: number;
  endYear: number;
} {
  const [a, b] = fiscalYear.split("-").map(Number);
  return { startYear: a, endYear: b };
}

export type KpiSnapshot = {
  fiscal_year: string;
  wagons: number;
  tonnage: number;
  freight: number;
  budget: number;
  variation: number;
  variation_pct: number | null;
};

export type MonthlyTrendPoint = {
  fiscalMonth: number; // 1..12 (Jul=1)
  monthLabel: string;
  year: number;
  month: number;
  wagons: number;
  tonnage: number;
  freight: number;
};

export type CommodityContribution = {
  commodity_id: number;
  commodity: string;
  category: string;
  wagons: number;
  tonnage: number;
  freight: number;
  wagon_pct: number;
  freight_pct: number;
};

export type BudgetVsActualPoint = {
  fiscalMonth: number;
  monthLabel: string;
  year: number;
  month: number;
  actual: number;
  budget: number;
  variance: number;
};

export type CommodityTrendPoint = {
  fiscalMonth: number;
  monthLabel: string;
  freight: number;
  wagons: number;
  tonnage: number;
};

export type CommodityTrend = {
  commodity_id: number;
  commodity: string;
  total_freight: number;
  points: CommodityTrendPoint[];
};

export type HeatmapCell = {
  commodity_id: number;
  commodity: string;
  fiscalMonth: number;
  freight: number;
};

export type PartnerTotal = {
  party_id: number;
  party: string;
  teus: number;
  freight: number;
};

export type ThroughputPoint = {
  fiscalMonth: number;
  monthLabel: string;
  teus: number;
  freight: number;
};

export type CoalSubcategoryTotal = {
  commodity_id: number;
  commodity: string;
  wagons: number;
  tonnage: number;
  freight: number;
};

export type CoalPartyTotal = {
  party_id: number;
  party: string;
  wagons: number;
  tonnage: number | null;
  freight: number | null;
};

export type ParetoPoint = {
  party_id: number;
  party: string;
  freight: number;
  cumulative_freight: number;
  cumulative_pct: number;
};

export type PeriodRollupRow = {
  commodity_id: number;
  commodity: string;
  wagons: number;
  tonnage: number;
  freight: number;
};

export type YoyRow = {
  commodity_id: number;
  commodity: string;
  current_wagons: number;
  current_tonnage: number;
  current_freight: number;
  prior_wagons: number;
  prior_tonnage: number;
  prior_freight: number;
  wagons_delta: number;
  tonnage_delta: number;
  freight_delta: number;
  freight_delta_pct: number | null;
};
