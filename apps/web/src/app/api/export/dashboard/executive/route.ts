import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  getAvailableFiscalYears,
  getBudgetVsActual,
  getCommodityContribution,
  getKpiSnapshot,
  getMonthlyTrend,
} from "@/lib/dashboard/queries";
import { buildXlsx, xlsxResponse } from "@/lib/exports/excel";

export async function GET(request: Request) {
  await requireSession();

  const url = new URL(request.url);
  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }
  const requested = url.searchParams.get("fy");
  const fy =
    requested && fiscalYears.includes(requested) ? requested : fiscalYears[0];

  const [kpis, contribution, trend, budgetActual] = await Promise.all([
    getKpiSnapshot(fy),
    getCommodityContribution(fy),
    getMonthlyTrend(fy),
    getBudgetVsActual(fy),
  ]);

  const buffer = await buildXlsx([
    {
      name: "Summary",
      columns: [
        { header: "Metric", key: "metric", width: 32 },
        { header: "Value", key: "value", width: 24, numFmt: "#,##0.000" },
      ],
      preamble: [
        ["Pakistan Railways — Executive Overview"],
        [`Fiscal Year ${fy}`],
        [`Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`],
      ],
      rows: kpis
        ? [
            { metric: "Total Wagons", value: kpis.wagons },
            { metric: "Total Tonnage", value: kpis.tonnage },
            { metric: "Freight Earnings (M)", value: kpis.freight },
            { metric: "Budget (M)", value: kpis.budget },
            { metric: "Variation (M)", value: kpis.variation },
            { metric: "Variation %", value: kpis.variation_pct ?? "" },
          ]
        : [],
    },
    {
      name: "Commodity contribution",
      columns: [
        { header: "Commodity", key: "commodity", width: 32 },
        { header: "Wagons", key: "wagons", width: 14, numFmt: "#,##0" },
        { header: "Tonnage", key: "tonnage", width: 16, numFmt: "#,##0.00" },
        { header: "Freight (M)", key: "freight", width: 14, numFmt: "#,##0.000" },
        { header: "Wagon %", key: "wagon_pct", width: 12, numFmt: "0.00" },
        { header: "Freight %", key: "freight_pct", width: 12, numFmt: "0.00" },
      ],
      rows: contribution.map((c) => ({
        commodity: c.commodity,
        wagons: c.wagons,
        tonnage: c.tonnage,
        freight: c.freight,
        wagon_pct: c.wagon_pct,
        freight_pct: c.freight_pct,
      })),
    },
    {
      name: "Monthly trend",
      columns: [
        { header: "Fiscal month", key: "monthLabel", width: 14 },
        { header: "Year", key: "year", width: 8, numFmt: "0" },
        { header: "Wagons", key: "wagons", width: 14, numFmt: "#,##0" },
        { header: "Tonnage", key: "tonnage", width: 16, numFmt: "#,##0.00" },
        { header: "Freight (M)", key: "freight", width: 14, numFmt: "#,##0.000" },
      ],
      rows: trend.map((p) => ({
        monthLabel: p.monthLabel,
        year: p.year,
        wagons: p.wagons,
        tonnage: p.tonnage,
        freight: p.freight,
      })),
    },
    {
      name: "Budget vs Actual",
      columns: [
        { header: "Fiscal month", key: "monthLabel", width: 14 },
        { header: "Actual (M)", key: "actual", width: 14, numFmt: "#,##0.000" },
        { header: "Budget (M)", key: "budget", width: 14, numFmt: "#,##0.000" },
        { header: "Variance (M)", key: "variance", width: 14, numFmt: "#,##0.000" },
      ],
      rows: budgetActual.map((p) => ({
        monthLabel: p.monthLabel,
        actual: p.actual,
        budget: p.budget,
        variance: p.variance,
      })),
    },
  ]);

  return xlsxResponse(buffer, `executive_${fy}.xlsx`);
}
