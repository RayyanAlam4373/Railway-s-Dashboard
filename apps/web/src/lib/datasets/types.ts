import type { z } from "zod";

export type FieldKind =
  | "year"
  | "month"
  | "integer"
  | "decimal"
  | "lookup"
  | "fiscal_year";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  // For lookup fields: which Supabase table provides the options, and which
  // column holds the user-visible label.
  lookup?: { table: LookupTable; displayKey: string; valueKey: "id" };
  // Display formatter for the table cell. Defaults vary by kind.
  format?: (value: unknown) => string;
  // Whether nulls are allowed (drives form input + table rendering).
  nullable?: boolean;
  // Numeric metadata (range hint on the form).
  min?: number;
  max?: number;
  step?: number;
};

export type LookupTable =
  | "commodities"
  | "container_parties"
  | "coal_parties"
  | "cargo_express_routes";

export type LookupOption = { id: number; label: string };

export type DatasetSlug =
  | "commodity-monthly"
  | "commodity-budget"
  | "cargo-express"
  | "coal-party"
  | "container-party"
  | "comparative";

export type DatasetConfig = {
  slug: DatasetSlug;
  title: string;
  description: string;
  // The Supabase table that holds the records.
  table: string;
  // Fields shown in the table and form, in display order.
  fields: FieldDef[];
  // zod schema applied to FormData on create/update.
  formSchema: z.ZodTypeAny;
  // Default sort (column, direction) for the list view.
  defaultSort: { key: string; direction: "asc" | "desc" };
  // Default page size for the list view.
  pageSize: number;
  // Foreign-key dropdowns to load on the form / list filter.
  lookups: LookupTable[];
};

// Subset of DatasetConfig safe to pass from a Server Component into a
// Client Component. `formSchema` is a Zod class instance, which the
// RSC serializer rejects ("Only plain objects … can be passed"). Server
// pages should call `toClientDataset()` before handing the config to any
// client component (RecordTable, RecordForm, FiltersBar).
export type ClientDatasetConfig = Omit<DatasetConfig, "formSchema">;

export function toClientDataset(d: DatasetConfig): ClientDatasetConfig {
  const { formSchema: _omit, ...rest } = d;
  void _omit;
  return rest;
}
