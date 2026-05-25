export type AlertType =
  | "revenue_drop"
  | "budget_variance"
  | "partner_concentration";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertRow = {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  scope: Record<string, unknown>;
  fingerprint: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  revenue_drop: "Revenue drop",
  budget_variance: "Budget variance",
  partner_concentration: "Partner concentration",
};

// Tunable in one place. When the client wants to change thresholds, edit
// here and re-run the evaluator. (Future enhancement: store in a settings
// table so admins can change without redeploy.)
export const ALERT_THRESHOLDS = {
  revenueDrop: {
    minPriorMonthFreightM: 10, // ignore tiny months
    dropPctWarning: 20,
    dropPctCritical: 35,
  },
  budgetVariance: {
    minBudgetM: 100,
    variancePctWarning: 15,
    variancePctCritical: 25,
  },
  partnerConcentration: {
    topNCount: 3,
    sharePctWarning: 55,
    sharePctCritical: 70,
  },
};
