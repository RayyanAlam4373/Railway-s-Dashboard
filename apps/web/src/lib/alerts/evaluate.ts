import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBudgetVsActual,
  getContainerPartyTotals,
  getMonthlyTrend,
} from "@/lib/dashboard/queries";
import { ALERT_THRESHOLDS, type AlertSeverity, type AlertType } from "./types";

type CandidateAlert = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  scope: Record<string, unknown>;
  fingerprint: string;
};

export type EvaluationResult = {
  evaluated: number;
  inserted: number;
  updated: number;
};

export async function evaluateAlerts(
  fiscalYear: string,
): Promise<EvaluationResult> {
  const [trend, budgetActual, partners] = await Promise.all([
    getMonthlyTrend(fiscalYear),
    getBudgetVsActual(fiscalYear),
    getContainerPartyTotals(fiscalYear),
  ]);

  const candidates: CandidateAlert[] = [
    ...revenueDropAlerts(trend, fiscalYear),
    ...budgetVarianceAlerts(budgetActual, fiscalYear),
    ...partnerConcentrationAlerts(partners, fiscalYear),
  ];

  if (candidates.length === 0) return { evaluated: 0, inserted: 0, updated: 0 };

  const supabase = await createSupabaseServerClient();

  // Look up existing rows by fingerprint so we know what's new vs. updated.
  const fingerprints = candidates.map((c) => c.fingerprint);
  const { data: existing, error: lookupError } = await supabase
    .from("alerts")
    .select("fingerprint")
    .in("fingerprint", fingerprints);
  if (lookupError) throw lookupError;
  const existingSet = new Set((existing ?? []).map((r) => String(r.fingerprint)));

  const { error: upsertError } = await supabase
    .from("alerts")
    .upsert(candidates, { onConflict: "fingerprint" });
  if (upsertError) throw upsertError;

  let inserted = 0;
  let updated = 0;
  for (const c of candidates) {
    if (existingSet.has(c.fingerprint)) updated += 1;
    else inserted += 1;
  }
  return { evaluated: candidates.length, inserted, updated };
}

function revenueDropAlerts(
  trend: Awaited<ReturnType<typeof getMonthlyTrend>>,
  fiscalYear: string,
): CandidateAlert[] {
  const { minPriorMonthFreightM, dropPctWarning, dropPctCritical } =
    ALERT_THRESHOLDS.revenueDrop;
  const out: CandidateAlert[] = [];

  for (let i = 1; i < trend.length; i++) {
    const prev = trend[i - 1];
    const curr = trend[i];
    if (prev.freight < minPriorMonthFreightM) continue;

    const dropPct = ((prev.freight - curr.freight) / prev.freight) * 100;
    if (dropPct < dropPctWarning) continue;

    const severity: AlertSeverity =
      dropPct >= dropPctCritical ? "critical" : "warning";

    out.push({
      type: "revenue_drop",
      severity,
      title: `Freight earnings fell ${dropPct.toFixed(1)}% in ${curr.monthLabel}`,
      message: `${curr.monthLabel} ${curr.year}: ${curr.freight.toFixed(3)} M vs ${prev.monthLabel} ${prev.year}: ${prev.freight.toFixed(3)} M.`,
      scope: {
        fiscal_year: fiscalYear,
        year: curr.year,
        month: curr.month,
        from_freight: prev.freight,
        to_freight: curr.freight,
        drop_pct: dropPct,
      },
      fingerprint: `revenue_drop:${curr.year}-${String(curr.month).padStart(2, "0")}`,
    });
  }
  return out;
}

function budgetVarianceAlerts(
  budgetActual: Awaited<ReturnType<typeof getBudgetVsActual>>,
  fiscalYear: string,
): CandidateAlert[] {
  const { minBudgetM, variancePctWarning, variancePctCritical } =
    ALERT_THRESHOLDS.budgetVariance;
  const out: CandidateAlert[] = [];

  for (const p of budgetActual) {
    if (p.budget < minBudgetM) continue;
    if (p.actual === 0) continue;
    const variancePct = ((p.actual - p.budget) / p.budget) * 100;
    if (Math.abs(variancePct) < variancePctWarning) continue;

    const severity: AlertSeverity =
      Math.abs(variancePct) >= variancePctCritical ? "critical" : "warning";
    const direction = variancePct < 0 ? "under" : "over";

    out.push({
      type: "budget_variance",
      severity,
      title: `${p.monthLabel} ${direction} budget by ${Math.abs(variancePct).toFixed(1)}%`,
      message: `Actual ${p.actual.toFixed(3)} M vs budget ${p.budget.toFixed(3)} M (variance ${p.variance.toFixed(3)} M).`,
      scope: {
        fiscal_year: fiscalYear,
        year: p.year,
        month: p.month,
        actual: p.actual,
        budget: p.budget,
        variance: p.variance,
        variance_pct: variancePct,
      },
      fingerprint: `budget_variance:${p.year}-${String(p.month).padStart(2, "0")}`,
    });
  }
  return out;
}

function partnerConcentrationAlerts(
  partners: Awaited<ReturnType<typeof getContainerPartyTotals>>,
  fiscalYear: string,
): CandidateAlert[] {
  const { topNCount, sharePctWarning, sharePctCritical } =
    ALERT_THRESHOLDS.partnerConcentration;
  const total = partners.reduce((s, p) => s + p.freight, 0);
  if (total === 0 || partners.length === 0) return [];

  const topShare =
    (partners.slice(0, topNCount).reduce((s, p) => s + p.freight, 0) / total) *
    100;
  if (topShare < sharePctWarning) return [];

  const severity: AlertSeverity =
    topShare >= sharePctCritical ? "critical" : "warning";

  return [
    {
      type: "partner_concentration",
      severity,
      title: `Top ${topNCount} container partners control ${topShare.toFixed(1)}% of freight`,
      message: `Top ${topNCount}: ${partners
        .slice(0, topNCount)
        .map((p) => p.party)
        .join(", ")}. Concentration risk threshold is ${sharePctWarning}%.`,
      scope: {
        fiscal_year: fiscalYear,
        top_n: topNCount,
        share_pct: topShare,
        partners: partners.slice(0, topNCount).map((p) => ({
          party_id: p.party_id,
          party: p.party,
          freight: p.freight,
        })),
      },
      fingerprint: `partner_concentration:${fiscalYear}`,
    },
  ];
}
