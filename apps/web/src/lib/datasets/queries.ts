import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatasetConfig, LookupOption, LookupTable } from "./types";

// Display column per lookup table. Mirrors the `displayKey` declared in the
// dataset registry; centralised here so the SELECT column matches the field
// the UI shows.
const LOOKUP_DISPLAY_COL: Record<LookupTable, string> = {
  commodities: "name",
  container_parties: "name",
  coal_parties: "name",
  cargo_express_routes: "code",
};

export type ListParams = {
  page: number;
  filters: Record<string, string>;
};

export type ListResult = {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listRecords(
  dataset: DatasetConfig,
  params: ListParams,
): Promise<ListResult> {
  const supabase = await createSupabaseServerClient();
  const pageSize = dataset.pageSize;
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from(dataset.table)
    .select("*", { count: "exact" })
    .order(dataset.defaultSort.key, {
      ascending: dataset.defaultSort.direction === "asc",
    })
    .range(from, to);

  for (const field of dataset.fields) {
    const raw = params.filters[field.key];
    if (raw === undefined || raw === "" || raw === "all") continue;
    if (field.kind === "fiscal_year") {
      q = q.eq(field.key, raw);
      continue;
    }
    if (
      field.kind === "year" ||
      field.kind === "month" ||
      field.kind === "integer" ||
      field.kind === "lookup"
    ) {
      const n = Number(raw);
      if (Number.isFinite(n)) q = q.eq(field.key, n);
    }
  }

  const { data, count, error } = await q;
  if (error) throw error;

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function getRecord(
  dataset: DatasetConfig,
  id: string,
): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(dataset.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadLookups(
  tables: LookupTable[],
): Promise<Record<LookupTable, LookupOption[]>> {
  const supabase = await createSupabaseServerClient();
  const entries = await Promise.all(
    tables.map(async (t) => {
      const displayCol = LOOKUP_DISPLAY_COL[t];
      const { data, error } = await supabase
        .from(t)
        .select(`id, ${displayCol}`)
        .eq("active", true)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order(displayCol, { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      const options: LookupOption[] = rows.map((r) => ({
        id: Number(r.id),
        label: String(r[displayCol]),
      }));
      return [t, options] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<LookupTable, LookupOption[]>;
}
