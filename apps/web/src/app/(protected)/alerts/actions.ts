"use server";

import { revalidatePath } from "next/cache";
import { canWriteFacts, requireSession } from "@/lib/auth/session";
import { evaluateAlerts, type EvaluationResult } from "@/lib/alerts/evaluate";
import { getAvailableFiscalYears } from "@/lib/dashboard/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RefreshResult =
  | { ok: true; fiscalYear: string; result: EvaluationResult }
  | { ok: false; message: string };

export async function refreshAlertsAction(): Promise<RefreshResult> {
  const session = await requireSession();
  if (!canWriteFacts(session.role)) {
    return {
      ok: false,
      message: "Your role does not permit refreshing alerts.",
    };
  }

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) {
    return { ok: false, message: "No commodity data yet — ingest first." };
  }
  const fy = fiscalYears[0];

  try {
    const result = await evaluateAlerts(fy);
    revalidatePath("/alerts");
    revalidatePath("/", "layout");
    return { ok: true, fiscalYear: fy, result };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Evaluation failed.",
    };
  }
}

export async function acknowledgeAlertAction(alertId: number): Promise<void> {
  const session = await requireSession();
  if (!canWriteFacts(session.role)) {
    throw new Error("Your role does not permit acknowledging alerts.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("alerts")
    .update({
      acknowledged_by: session.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId);
  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
  revalidatePath("/", "layout");
}
