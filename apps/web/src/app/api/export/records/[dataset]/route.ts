import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { loadLookups } from "@/lib/datasets/queries";
import { getDataset } from "@/lib/datasets/registry";
import { MONTH_NAMES } from "@/lib/datasets/registry";
import { buildXlsx, xlsxResponse, type SheetColumn } from "@/lib/exports/excel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FieldDef, LookupTable } from "@/lib/datasets/types";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ dataset: string }> },
) {
  await requireSession();

  const { dataset: slug } = await ctx.params;
  const dataset = getDataset(slug);
  if (!dataset) {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  }

  const url = new URL(request.url);

  const supabase = await createSupabaseServerClient();
  let q = supabase.from(dataset.table).select("*");

  for (const field of dataset.fields) {
    const raw = url.searchParams.get(field.key);
    if (raw === null || raw === "" || raw === "all") continue;
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

  q = q.order(dataset.defaultSort.key, {
    ascending: dataset.defaultSort.direction === "asc",
  });

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lookups = await loadLookups(dataset.lookups);
  const lookupMaps = Object.fromEntries(
    (Object.entries(lookups) as [LookupTable, typeof lookups[LookupTable]][]).map(
      ([k, opts]) => [k, new Map(opts.map((o) => [o.id, o.label]))],
    ),
  ) as Partial<Record<LookupTable, Map<number, string>>>;

  const columns: SheetColumn[] = dataset.fields.map((f) => ({
    header: f.label,
    key: f.key,
    width: f.kind === "lookup" ? 32 : 14,
    numFmt: numFmtFor(f),
  }));

  const rows = (data ?? []).map((row) => {
    const out: Record<string, unknown> = {};
    for (const f of dataset.fields) {
      out[f.key] = renderCell(f, (row as Record<string, unknown>)[f.key], lookupMaps);
    }
    return out;
  });

  const fyParam = url.searchParams.get("fiscal_year");
  const yearParam = url.searchParams.get("year");
  const periodLabel = fyParam ?? yearParam ?? "all periods";

  const buffer = await buildXlsx([
    {
      name: dataset.title,
      columns,
      rows,
      preamble: [
        [`Pakistan Railways — ${dataset.title}`],
        [`Export of ${rows.length} records · ${periodLabel}`],
        [`Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`],
      ],
    },
  ]);

  const filename = `${dataset.slug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return xlsxResponse(buffer, filename);
}

function numFmtFor(field: FieldDef): string | undefined {
  switch (field.kind) {
    case "integer":
    case "year":
      return "#,##0";
    case "decimal":
      return "#,##0.000";
    default:
      return undefined;
  }
}

function renderCell(
  field: FieldDef,
  value: unknown,
  lookups: Partial<Record<LookupTable, Map<number, string>>>,
): unknown {
  if (value === null || value === undefined) return "";

  if (field.kind === "month") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return MONTH_NAMES[n - 1];
    return value;
  }
  if (field.kind === "lookup" && field.lookup) {
    return lookups[field.lookup.table]?.get(Number(value)) ?? `#${value}`;
  }
  return value;
}
