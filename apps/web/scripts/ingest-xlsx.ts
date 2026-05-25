import ExcelJS from "exceljs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMODITY_ALIASES,
  CONTAINER_PARTY_ALIASES,
  MONTH_NUMBERS,
  cleanNumeric,
  normalizeLabel,
} from "./lib/aliases.js";
import { adminClient } from "./lib/supabase.js";

const here = dirname(fileURLToPath(import.meta.url));
// apps/web/scripts → repo root.
const REPO_ROOT = resolve(here, "..", "..", "..");

// Source files use these labels for non-data summary rows; ignore them.
const AGGREGATE_ROW_LABELS = new Set([
  "total",
  "total container",
  "total  coal",
  "total coal",
  "budget",
  "variation",
  "percentage",
]);

type IngestResult = {
  file: string;
  rowsUpserted: number;
  warnings: string[];
  errors: string[];
};

type LookupMaps = {
  commodity: Map<string, number>;
  containerParty: Map<string, number>;
  coalParty: Map<string, number>;
  cargoRoute: Map<string, number>;
};

async function loadLookups(
  supabase: ReturnType<typeof adminClient>,
): Promise<LookupMaps> {
  const [c, cp, kp, r] = await Promise.all([
    supabase.from("commodities").select("id, name"),
    supabase.from("container_parties").select("id, name"),
    supabase.from("coal_parties").select("id, name"),
    supabase.from("cargo_express_routes").select("id, code"),
  ]);

  if (c.error) throw c.error;
  if (cp.error) throw cp.error;
  if (kp.error) throw kp.error;
  if (r.error) throw r.error;

  return {
    commodity: new Map(c.data.map((x) => [x.name, x.id as number])),
    containerParty: new Map(cp.data.map((x) => [x.name, x.id as number])),
    coalParty: new Map(kp.data.map((x) => [x.name, x.id as number])),
    cargoRoute: new Map(r.data.map((x) => [x.code, x.id as number])),
  };
}

function getCellText(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in (v as object)) {
    type RichText = { richText: { text: string }[] };
    return (v as RichText).richText.map((rt) => rt.text).join("");
  }
  return String(v);
}

// Routes formula cells through their cached `result` and applies the same
// junk-coercion as cleanNumeric (so callers don't need to re-clean).
function getCellNumeric(row: ExcelJS.Row, col: number): number | null {
  const v = row.getCell(col).value;
  if (v && typeof v === "object" && "result" in (v as object)) {
    return cleanNumeric((v as { result: unknown }).result);
  }
  return cleanNumeric(v);
}

// ─── Commodity wise Loading Earning 2025-2026.xlsx ─────────────────────────
// Two horizontal tables on one sheet (Jul-Dec, Jan-Jun). Each table has
// 6 month-triples (Wagons, Tonnage, Freight); footer rows hold Total /
// Budget / Variation / Percentage.
async function ingestCommodityFile(
  supabase: ReturnType<typeof adminClient>,
  lookups: LookupMaps,
): Promise<IngestResult> {
  const file = "Commodity wise Loading Earning 2025-2026.xlsx";
  const warnings: string[] = [];
  const errors: string[] = [];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(REPO_ROOT, file));
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error(`No worksheet found in ${file}`);

  const tables = [
    {
      dataStart: 6,
      dataEnd: 23,
      months: [
        { year: 2025, month: 7 },
        { year: 2025, month: 8 },
        { year: 2025, month: 9 },
        { year: 2025, month: 10 },
        { year: 2025, month: 11 },
        { year: 2025, month: 12 },
      ],
      budgetRow: 25,
    },
    {
      dataStart: 31,
      dataEnd: 48,
      months: [
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
        { year: 2026, month: 3 },
        { year: 2026, month: 4 },
        { year: 2026, month: 5 },
        { year: 2026, month: 6 },
      ],
      budgetRow: 50,
    },
  ];

  const monthlyRows: Array<{
    commodity_id: number;
    year: number;
    month: number;
    wagons: number;
    tonnage: number;
    freight: number;
  }> = [];
  const budgetRows: Array<{
    year: number;
    month: number;
    budget_freight: number;
  }> = [];

  for (const table of tables) {
    for (let r = table.dataStart; r <= table.dataEnd; r++) {
      const row = ws.getRow(r);
      const labelRaw = getCellText(row, 2).trim();
      if (!labelRaw) continue;
      const labelLower = normalizeLabel(labelRaw);
      if (AGGREGATE_ROW_LABELS.has(labelLower)) continue;
      const canonical = COMMODITY_ALIASES[labelLower];
      if (!canonical) {
        warnings.push(
          `[${file}] Unknown commodity label "${labelRaw}" at row ${r} — row skipped.`,
        );
        continue;
      }
      const commodityId = lookups.commodity.get(canonical);
      if (commodityId === undefined) {
        warnings.push(
          `[${file}] Canonical commodity "${canonical}" not in lookup — row ${r} skipped.`,
        );
        continue;
      }

      table.months.forEach((mInfo, idx) => {
        const baseCol = 3 + idx * 3;
        const wagons = getCellNumeric(row, baseCol);
        const tonnage = getCellNumeric(row, baseCol + 1);
        const freight = getCellNumeric(row, baseCol + 2);
        // Distinguish legitimate "reported zero" (all three cells are explicit
        // 0 — e.g. Wheat had no activity) from placeholder months (cells blank,
        // or mixed blank + 0 — e.g. May 2026 in the source). Only the former
        // should be ingested.
        const hasPositive =
          (wagons ?? 0) > 0 || (tonnage ?? 0) > 0 || (freight ?? 0) > 0;
        const hasAnyNull =
          wagons === null || tonnage === null || freight === null;
        if (!hasPositive && hasAnyNull) return;
        monthlyRows.push({
          commodity_id: commodityId,
          year: mInfo.year,
          month: mInfo.month,
          wagons: wagons ?? 0,
          tonnage: tonnage ?? 0,
          freight: freight ?? 0,
        });
      });
    }

    const budgetRow = ws.getRow(table.budgetRow);
    table.months.forEach((mInfo, idx) => {
      const budget = getCellNumeric(budgetRow, 3 + idx * 3 + 2);
      if (budget !== null && budget > 0) {
        budgetRows.push({
          year: mInfo.year,
          month: mInfo.month,
          budget_freight: budget,
        });
      }
    });
  }

  const { error: cmErr } = await supabase
    .from("commodity_monthly")
    .upsert(monthlyRows, { onConflict: "commodity_id,year,month" });
  if (cmErr) errors.push(`commodity_monthly upsert: ${cmErr.message}`);

  const { error: bErr } = await supabase
    .from("commodity_budget")
    .upsert(budgetRows, { onConflict: "year,month" });
  if (bErr) errors.push(`commodity_budget upsert: ${bErr.message}`);

  warnings.push(
    `[${file}] Finding #4: source uses two horizontal tables and contains the typo "GITA Contaienr" — normalized via alias map.`,
  );

  return {
    file,
    rowsUpserted: monthlyRows.length + budgetRows.length,
    warnings,
    errors,
  };
}

// ─── JUL-APR 2025-2026 Comparative.xlsx ────────────────────────────────────
async function ingestComparativeFile(
  supabase: ReturnType<typeof adminClient>,
  lookups: LookupMaps,
): Promise<IngestResult> {
  const file = "JUL-APR 2025-2026 Comparative.xlsx";
  const warnings: string[] = [];
  const errors: string[] = [];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(REPO_ROOT, file));
  const ws = wb.getWorksheet("JUL-APR");
  if (!ws) throw new Error(`Sheet "JUL-APR" not found in ${file}`);

  // Cols: 2=Commodity, 3..5=current FY (W,T,F), 6..8=prior FY (W,T,F), 9..11=variation (skip).
  const rows: Array<{
    commodity_id: number;
    fiscal_year: string;
    period_start_month: number;
    period_end_month: number;
    wagons: number;
    tonnage: number;
    freight: number;
  }> = [];

  for (let r = 9; r <= 26; r++) {
    const row = ws.getRow(r);
    const labelRaw = getCellText(row, 2).trim();
    if (!labelRaw) continue;
    const labelLower = normalizeLabel(labelRaw);
    if (AGGREGATE_ROW_LABELS.has(labelLower)) continue;

    const canonical = COMMODITY_ALIASES[labelLower];
    if (!canonical) {
      warnings.push(
        `[${file}] Unknown commodity "${labelRaw}" at row ${r} — skipped.`,
      );
      continue;
    }
    const commodityId = lookups.commodity.get(canonical);
    if (commodityId === undefined) continue;

    rows.push({
      commodity_id: commodityId,
      fiscal_year: "2024-2025",
      period_start_month: 7,
      period_end_month: 4,
      wagons: getCellNumeric(row, 6) ?? 0,
      tonnage: getCellNumeric(row, 7) ?? 0,
      freight: getCellNumeric(row, 8) ?? 0,
    });
    rows.push({
      commodity_id: commodityId,
      fiscal_year: "2025-2026",
      period_start_month: 7,
      period_end_month: 4,
      wagons: getCellNumeric(row, 3) ?? 0,
      tonnage: getCellNumeric(row, 4) ?? 0,
      freight: getCellNumeric(row, 5) ?? 0,
    });
  }

  const { error } = await supabase
    .from("comparative_yearly")
    .upsert(rows, {
      onConflict: "commodity_id,fiscal_year,period_start_month,period_end_month",
    });
  if (error) errors.push(`comparative_yearly upsert: ${error.message}`);

  warnings.push(
    `[${file}] Finding #3: this file shows 2024-25 total freight as 23,333.258 — but Percentage Contribution.xlsx shows 23,328.258 and the analysis MD shows 23,332.258. Stored value: 23,333.258. Confirm canonical with client.`,
  );
  warnings.push(
    `[${file}] Finding #5: skipped 5 redundant rolling-cutoff sheets; v_period_comparison recomputes them.`,
  );
  warnings.push(
    `[${file}] Finding #6: Variation column for Freight is truncated in source — ignored on ingest (view recomputes).`,
  );

  return { file, rowsUpserted: rows.length, warnings, errors };
}

// ─── Cargo Exp. Month wise 2025-2026.xlsx ──────────────────────────────────
async function ingestCargoExpressFile(
  supabase: ReturnType<typeof adminClient>,
  lookups: LookupMaps,
): Promise<IngestResult> {
  const file = "Cargo Exp. Month wise 2025-2026.xlsx";
  const warnings: string[] = [];
  const errors: string[] = [];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(REPO_ROOT, file));
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error(`No worksheet found in ${file}`);

  const route501 = lookups.cargoRoute.get("501-Up (KBX)");
  const route503 = lookups.cargoRoute.get("503-Up (KYC)");
  if (!route501 || !route503) {
    throw new Error("cargo_express_routes not seeded — run seed-lookups first.");
  }

  const rows: Array<{
    route_id: number;
    year: number;
    month: number;
    wagons: number;
    earning: number;
  }> = [];

  const rowCount = ws.actualRowCount;
  for (let r = 8; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const monthLabel = normalizeLabel(getCellText(row, 3));
    const yearCell = getCellNumeric(row, 4);
    if (!monthLabel || yearCell === null) continue;

    const month = MONTH_NUMBERS[monthLabel];
    if (!month) {
      warnings.push(`[${file}] Unknown month "${monthLabel}" at row ${r}.`);
      continue;
    }
    const year = Math.trunc(yearCell);

    const w501 = getCellNumeric(row, 5);
    const e501 = getCellNumeric(row, 6);
    const w503 = getCellNumeric(row, 7);
    const e503 = getCellNumeric(row, 8);
    if (!w501 && !e501 && !w503 && !e503) continue;

    if (w501 !== null || e501 !== null) {
      rows.push({
        route_id: route501,
        year,
        month,
        wagons: w501 ?? 0,
        earning: e501 ?? 0,
      });
    }
    if (w503 !== null || e503 !== null) {
      rows.push({
        route_id: route503,
        year,
        month,
        wagons: w503 ?? 0,
        earning: e503 ?? 0,
      });
    }
  }

  const { error } = await supabase
    .from("cargo_express_monthly")
    .upsert(rows, { onConflict: "route_id,year,month" });
  if (error) errors.push(`cargo_express_monthly upsert: ${error.message}`);

  return { file, rowsUpserted: rows.length, warnings, errors };
}

// ─── Coal Party wise 2025-2026 JUL-APR.xlsx — SKIPPED ──────────────────────
// Source has only Wagon column (Finding #1) AND is a 10-month aggregate, not
// monthly (Finding #2). Schema expects monthly rows — needs client decision.
function ingestCoalPartyFile(): IngestResult {
  const file = "Coal Party wise 2025-2026 JUL-APR.xlsx";
  return {
    file,
    rowsUpserted: 0,
    warnings: [
      `[${file}] SKIPPED — Finding #1: source has only the Wagon column (title promises Loading, Tonnage & Earning).`,
      `[${file}] SKIPPED — Finding #2: source is a JUL-APR aggregate per party, not monthly.`,
      `[${file}] Records can still be added through the UI one month at a time.`,
    ],
    errors: [],
  };
}

// ─── Party wise Container.xlsx ─────────────────────────────────────────────
// Two stacked horizontal tables; each row holds Month, Year, then party
// pairs (TEUs, Freight). Last pair is the Total column — skipped.
async function ingestContainerPartyFile(
  supabase: ReturnType<typeof adminClient>,
  lookups: LookupMaps,
): Promise<IngestResult> {
  const file = "Party wise Container.xlsx";
  const warnings: string[] = [];
  const errors: string[] = [];

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(REPO_ROOT, file));
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error(`No worksheet found in ${file}`);

  const tables = [
    {
      headerRow: 5,
      dataStart: 7,
      dataEnd: 18,
      firstPartyCol: 4,
      lastPartyCol: 25,
    },
    {
      headerRow: 22,
      dataStart: 24,
      dataEnd: 35,
      firstPartyCol: 4,
      lastPartyCol: 25,
    },
  ];

  const rows: Array<{
    party_id: number;
    year: number;
    month: number;
    teus: number;
    freight: number;
  }> = [];

  for (const t of tables) {
    const headerRow = ws.getRow(t.headerRow);
    const partyByCol = new Map<number, number>();
    for (let c = t.firstPartyCol; c < t.lastPartyCol; c += 2) {
      const headerText = normalizeLabel(getCellText(headerRow, c));
      if (!headerText || headerText === "total") continue;
      const canonical = CONTAINER_PARTY_ALIASES[headerText];
      if (!canonical) {
        warnings.push(
          `[${file}] Unknown container party header "${headerText}" at col ${c} — skipped.`,
        );
        continue;
      }
      const id = lookups.containerParty.get(canonical);
      if (id === undefined) {
        warnings.push(
          `[${file}] Container party "${canonical}" missing from lookup — col ${c} skipped.`,
        );
        continue;
      }
      partyByCol.set(c, id);
    }

    for (let r = t.dataStart; r <= t.dataEnd; r++) {
      const row = ws.getRow(r);
      const monthLabel = normalizeLabel(getCellText(row, 2));
      const yearCell = getCellNumeric(row, 3);
      if (!monthLabel || yearCell === null || monthLabel === "total") continue;
      const month = MONTH_NUMBERS[monthLabel];
      if (!month) continue;
      const year = Math.trunc(yearCell);

      for (const [col, partyId] of partyByCol) {
        const teus = getCellNumeric(row, col);
        const freight = getCellNumeric(row, col + 1);
        if (teus === null && freight === null) continue;
        rows.push({
          party_id: partyId,
          year,
          month,
          teus: teus ?? 0,
          freight: freight ?? 0,
        });
      }
    }
  }

  // The two tables could theoretically share a party — sum rather than overwrite.
  const dedup = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.party_id}|${r.year}|${r.month}`;
    const prev = dedup.get(k);
    dedup.set(
      k,
      prev
        ? { ...prev, teus: prev.teus + r.teus, freight: prev.freight + r.freight }
        : r,
    );
  }
  const finalRows = [...dedup.values()];

  const { error } = await supabase
    .from("container_party_monthly")
    .upsert(finalRows, { onConflict: "party_id,year,month" });
  if (error) errors.push(`container_party_monthly upsert: ${error.message}`);

  warnings.push(
    `[${file}] Finding #7: normalized typos in party names via alias map.`,
  );
  warnings.push(
    `[${file}] Finding #8: party-wise total freight is 19.666 M higher than the commodity file's container total. Confirm classification with client.`,
  );

  return { file, rowsUpserted: finalRows.length, warnings, errors };
}

// Percentages drift when records are added (Finding #9) — recomputed by
// public.v_commodity_contribution instead of ingested.
function ingestPercentageContribution(): IngestResult {
  return {
    file: "Percentage Contribution.xlsx",
    rowsUpserted: 0,
    warnings: [
      "[Percentage Contribution.xlsx] NOT INGESTED — Finding #9: percentages recomputed by v_commodity_contribution.",
    ],
    errors: [],
  };
}

async function main() {
  const supabase = adminClient();
  const lookups = await loadLookups(supabase);

  if (lookups.commodity.size === 0) {
    throw new Error(
      "Lookup tables are empty. Run `pnpm seed:lookups` before ingesting.",
    );
  }

  const results = await Promise.all([
    ingestCommodityFile(supabase, lookups),
    ingestComparativeFile(supabase, lookups),
    ingestCargoExpressFile(supabase, lookups),
    ingestContainerPartyFile(supabase, lookups),
  ]);
  results.push(ingestCoalPartyFile(), ingestPercentageContribution());

  console.log("\n=== Ingestion summary ===");
  for (const r of results) {
    console.log(`\n${r.file}`);
    console.log(`  rows upserted: ${r.rowsUpserted}`);
    if (r.warnings.length) {
      console.log("  warnings:");
      for (const w of r.warnings) console.log(`    - ${w}`);
    }
    if (r.errors.length) {
      console.log("  errors:");
      for (const e of r.errors) console.log(`    ! ${e}`);
    }
  }

  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  if (totalErrors > 0) {
    console.error(`\nIngestion completed with ${totalErrors} error(s).`);
    process.exit(1);
  }
  console.log("\nIngestion complete.");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
