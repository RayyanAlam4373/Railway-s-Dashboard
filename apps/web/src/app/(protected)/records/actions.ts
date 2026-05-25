"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canDeleteFacts, canWriteFacts, requireSession } from "@/lib/auth/session";
import { getDataset } from "@/lib/datasets/registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function formObject(formData: FormData): Record<string, FormDataEntryValue> {
  const out: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("$ACTION_")) continue;
    out[k] = v;
  }
  return out;
}

async function logAudit(
  userId: string,
  table: string,
  rowId: string,
  action: "insert" | "update" | "delete",
  diff: unknown,
) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({
    user_id: userId,
    table_name: table,
    row_id: rowId,
    action,
    diff,
  });
}

export async function createRecordAction(
  datasetSlug: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!canWriteFacts(session.role)) {
    return { ok: false, message: "Your role does not permit adding records." };
  }

  const dataset = getDataset(datasetSlug);
  if (!dataset) return { ok: false, message: `Unknown dataset "${datasetSlug}".` };

  const parsed = dataset.formSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(dataset.table)
    .insert(parsed.data as never)
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
  }

  await logAudit(session.id, dataset.table, String(data.id), "insert", parsed.data);
  revalidatePath(`/records/${datasetSlug}`);
  redirect(`/records/${datasetSlug}?created=${data.id}`);
}

export async function updateRecordAction(
  datasetSlug: string,
  recordId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!canWriteFacts(session.role)) {
    return { ok: false, message: "Your role does not permit editing records." };
  }

  const dataset = getDataset(datasetSlug);
  if (!dataset) return { ok: false, message: `Unknown dataset "${datasetSlug}".` };

  const parsed = dataset.formSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from(dataset.table)
    .update(parsed.data as never)
    .eq("id", recordId);

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
  }

  await logAudit(session.id, dataset.table, recordId, "update", parsed.data);
  revalidatePath(`/records/${datasetSlug}`);
  redirect(`/records/${datasetSlug}?updated=${recordId}`);
}

export async function deleteRecordAction(
  datasetSlug: string,
  recordId: string,
): Promise<void> {
  const session = await requireSession();
  if (!canDeleteFacts(session.role)) {
    throw new Error("Only admins can delete records.");
  }

  const dataset = getDataset(datasetSlug);
  if (!dataset) throw new Error(`Unknown dataset "${datasetSlug}".`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(dataset.table).delete().eq("id", recordId);
  if (error) throw new Error(friendlyError(error.message));

  await logAudit(session.id, dataset.table, recordId, "delete", { id: recordId });
  // No redirect — caller invokes this inside startTransition and a thrown
  // NEXT_REDIRECT would be swallowed by its try/catch.
  revalidatePath(`/records/${datasetSlug}`);
}

function friendlyError(msg: string): string {
  if (msg.includes("duplicate key")) {
    return "A record with the same key already exists (same commodity/party + year + month).";
  }
  if (msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("rls")) {
    return "You don't have permission to perform this action.";
  }
  return msg;
}
