import { z } from "zod";
import type { DatasetConfig, DatasetSlug } from "./types";

const fyYearMin = 2000;
const fyYearMax = 2100;

const integerField = z.coerce
  .number({ error: "Must be a number." })
  .int("Must be a whole number.")
  .min(0, "Must be ≥ 0.");

const decimalField = z.coerce
  .number({ error: "Must be a number." })
  .min(0, "Must be ≥ 0.")
  .refine((n) => Number.isFinite(n), "Must be a finite number.");

const yearField = z.coerce
  .number({ error: "Must be a year." })
  .int()
  .min(fyYearMin)
  .max(fyYearMax);

const monthField = z.coerce
  .number({ error: "Must be a month (1-12)." })
  .int()
  .min(1)
  .max(12);

const fiscalYearField = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY (e.g. 2025-2026).");

const commodityMonthlySchema = z.object({
  commodity_id: z.coerce.number().int().positive(),
  year: yearField,
  month: monthField,
  wagons: integerField,
  tonnage: decimalField,
  freight: decimalField,
});

const commodityBudgetSchema = z.object({
  year: yearField,
  month: monthField,
  budget_freight: decimalField,
});

const cargoExpressSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  year: yearField,
  month: monthField,
  wagons: integerField,
  earning: decimalField,
});

// tonnage / freight are nullable per Finding #1 (Coal Party file lacks them).
const optionalDecimal = z
  .union([z.literal(""), z.coerce.number().min(0)])
  .transform((v) => (v === "" ? null : v));

const coalPartySchema = z.object({
  party_id: z.coerce.number().int().positive(),
  year: yearField,
  month: monthField,
  wagons: integerField,
  tonnage: optionalDecimal,
  freight: optionalDecimal,
});

const containerPartySchema = z.object({
  party_id: z.coerce.number().int().positive(),
  year: yearField,
  month: monthField,
  teus: decimalField,
  freight: decimalField,
});

const comparativeSchema = z.object({
  commodity_id: z.coerce.number().int().positive(),
  fiscal_year: fiscalYearField,
  period_start_month: monthField,
  period_end_month: monthField,
  wagons: integerField,
  tonnage: decimalField,
  freight: decimalField,
});

export const DATASETS: Record<DatasetSlug, DatasetConfig> = {
  "commodity-monthly": {
    slug: "commodity-monthly",
    title: "Commodity (monthly)",
    description:
      "Wagons, tonnage and freight loaded per commodity, per month. Source: Commodity wise Loading Earning.",
    table: "commodity_monthly",
    fields: [
      {
        key: "commodity_id",
        label: "Commodity",
        kind: "lookup",
        lookup: { table: "commodities", displayKey: "name", valueKey: "id" },
      },
      { key: "year", label: "Year", kind: "year", min: fyYearMin, max: fyYearMax },
      { key: "month", label: "Month", kind: "month" },
      { key: "wagons", label: "Wagons", kind: "integer", min: 0 },
      { key: "tonnage", label: "Tonnage", kind: "decimal", min: 0, step: 0.01 },
      { key: "freight", label: "Freight (M)", kind: "decimal", min: 0, step: 0.001 },
    ],
    formSchema: commodityMonthlySchema,
    defaultSort: { key: "year", direction: "desc" },
    pageSize: 25,
    lookups: ["commodities"],
  },

  "commodity-budget": {
    slug: "commodity-budget",
    title: "Commodity budget (monthly)",
    description: "Monthly freight-earning budget targets across all commodities.",
    table: "commodity_budget",
    fields: [
      { key: "year", label: "Year", kind: "year", min: fyYearMin, max: fyYearMax },
      { key: "month", label: "Month", kind: "month" },
      {
        key: "budget_freight",
        label: "Budget freight (M)",
        kind: "decimal",
        min: 0,
        step: 0.001,
      },
    ],
    formSchema: commodityBudgetSchema,
    defaultSort: { key: "year", direction: "desc" },
    pageSize: 25,
    lookups: [],
  },

  "cargo-express": {
    slug: "cargo-express",
    title: "Cargo Express (monthly)",
    description:
      "Wagons and earnings for 501-Up / 503-Up Cargo Express trains, per month.",
    table: "cargo_express_monthly",
    fields: [
      {
        key: "route_id",
        label: "Route",
        kind: "lookup",
        lookup: { table: "cargo_express_routes", displayKey: "code", valueKey: "id" },
      },
      { key: "year", label: "Year", kind: "year", min: fyYearMin, max: fyYearMax },
      { key: "month", label: "Month", kind: "month" },
      { key: "wagons", label: "Wagons", kind: "integer", min: 0 },
      { key: "earning", label: "Earning (M)", kind: "decimal", min: 0, step: 0.001 },
    ],
    formSchema: cargoExpressSchema,
    defaultSort: { key: "year", direction: "desc" },
    pageSize: 25,
    lookups: ["cargo_express_routes"],
  },

  "coal-party": {
    slug: "coal-party",
    title: "Coal — party (monthly)",
    description:
      "Wagons (and, when available, tonnage + freight) per coal customer, per month.",
    table: "coal_party_monthly",
    fields: [
      {
        key: "party_id",
        label: "Party",
        kind: "lookup",
        lookup: { table: "coal_parties", displayKey: "name", valueKey: "id" },
      },
      { key: "year", label: "Year", kind: "year", min: fyYearMin, max: fyYearMax },
      { key: "month", label: "Month", kind: "month" },
      { key: "wagons", label: "Wagons", kind: "integer", min: 0 },
      {
        key: "tonnage",
        label: "Tonnage",
        kind: "decimal",
        min: 0,
        step: 0.01,
        nullable: true,
      },
      {
        key: "freight",
        label: "Freight (M)",
        kind: "decimal",
        min: 0,
        step: 0.001,
        nullable: true,
      },
    ],
    formSchema: coalPartySchema,
    defaultSort: { key: "year", direction: "desc" },
    pageSize: 25,
    lookups: ["coal_parties"],
  },

  "container-party": {
    slug: "container-party",
    title: "Container — party (monthly)",
    description:
      "TEUs and freight per logistics partner / terminal, per month. Source: Party wise Container.",
    table: "container_party_monthly",
    fields: [
      {
        key: "party_id",
        label: "Party",
        kind: "lookup",
        lookup: { table: "container_parties", displayKey: "name", valueKey: "id" },
      },
      { key: "year", label: "Year", kind: "year", min: fyYearMin, max: fyYearMax },
      { key: "month", label: "Month", kind: "month" },
      { key: "teus", label: "TEUs", kind: "decimal", min: 0, step: 1 },
      { key: "freight", label: "Freight (M)", kind: "decimal", min: 0, step: 0.001 },
    ],
    formSchema: containerPartySchema,
    defaultSort: { key: "year", direction: "desc" },
    pageSize: 25,
    lookups: ["container_parties"],
  },

  comparative: {
    slug: "comparative",
    title: "Comparative (per fiscal-year window)",
    description:
      "Per-commodity aggregates over a fiscal-year window (e.g., JUL-APR). Used to store prior-year totals.",
    table: "comparative_yearly",
    fields: [
      {
        key: "commodity_id",
        label: "Commodity",
        kind: "lookup",
        lookup: { table: "commodities", displayKey: "name", valueKey: "id" },
      },
      { key: "fiscal_year", label: "Fiscal year", kind: "fiscal_year" },
      { key: "period_start_month", label: "Period start", kind: "month" },
      { key: "period_end_month", label: "Period end", kind: "month" },
      { key: "wagons", label: "Wagons", kind: "integer", min: 0 },
      { key: "tonnage", label: "Tonnage", kind: "decimal", min: 0, step: 0.01 },
      { key: "freight", label: "Freight (M)", kind: "decimal", min: 0, step: 0.001 },
    ],
    formSchema: comparativeSchema,
    defaultSort: { key: "fiscal_year", direction: "desc" },
    pageSize: 50,
    lookups: ["commodities"],
  },
};

export function getDataset(slug: string): DatasetConfig | null {
  if (!(slug in DATASETS)) return null;
  return DATASETS[slug as DatasetSlug];
}

export const DATASET_LIST = Object.values(DATASETS);

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
