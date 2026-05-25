import { fmtDecimal3, fmtInt } from "@/lib/dashboard/format";
import { MONTH_NAMES } from "./registry";
import type { FieldDef, LookupOption, LookupTable } from "./types";

export type LookupMap = Partial<Record<LookupTable, Map<number, string>>>;

export function buildLookupMap(
  lookups: Partial<Record<LookupTable, LookupOption[]>>,
): LookupMap {
  const out: LookupMap = {};
  for (const [table, opts] of Object.entries(lookups)) {
    if (!opts) continue;
    out[table as LookupTable] = new Map(opts.map((o) => [o.id, o.label]));
  }
  return out;
}

export function formatCell(
  field: FieldDef,
  value: unknown,
  lookups: LookupMap,
): string {
  if (value === null || value === undefined) return "—";

  switch (field.kind) {
    case "month": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1 || n > 12) return String(value);
      return MONTH_NAMES[n - 1];
    }
    case "year":
      return String(Math.trunc(Number(value)));
    case "fiscal_year":
      return String(value);
    case "integer":
      return fmtInt(Number(value));
    case "decimal":
      return fmtDecimal3(Number(value));
    case "lookup": {
      if (!field.lookup) return String(value);
      const map = lookups[field.lookup.table];
      return map?.get(Number(value)) ?? `#${value}`;
    }
  }
}
