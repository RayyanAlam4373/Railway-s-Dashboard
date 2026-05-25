import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AlertRow } from "./types";

export async function listAlerts(
  scope: "active" | "all" = "active",
): Promise<AlertRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (scope === "active") q = q.is("acknowledged_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AlertRow[];
}

export async function countActiveAlerts(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .is("acknowledged_at", null);
  if (error) throw error;
  return count ?? 0;
}
