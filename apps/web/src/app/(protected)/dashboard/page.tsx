import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetActualChart } from "@/components/dashboard/budget-actual-chart";
import { CommodityDonut } from "@/components/dashboard/commodity-donut";
import { FreightTrendChart } from "@/components/dashboard/freight-trend-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TopCommoditiesBar } from "@/components/dashboard/top-commodities-bar";
import { YearFilter } from "@/components/dashboard/year-filter";
import { ExportPrintActions } from "@/components/export-print-actions";
import { requireSession } from "@/lib/auth/session";
import {
  fmtInt,
  fmtMillion,
  fmtPct,
  fmtSignedMillion,
  fmtTonnage,
} from "@/lib/dashboard/format";
import {
  getAvailableFiscalYears,
  getBudgetVsActual,
  getCommodityContribution,
  getKpiSnapshot,
  getMonthlyTrend,
} from "@/lib/dashboard/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveFiscalYear(
  raw: string | string[] | undefined,
  available: string[],
): string {
  if (typeof raw === "string" && available.includes(raw)) return raw;
  return available[0];
}

function trendOfVariation(
  variation: number | undefined,
): "positive" | "negative" | "neutral" {
  if (variation === undefined || variation === 0) return "neutral";
  return variation > 0 ? "positive" : "negative";
}

export default async function DashboardPage({ searchParams }: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) {
    return <EmptyState />;
  }

  const requestedFy = resolveFiscalYear(sp.fy, fiscalYears);

  const [kpis, trend, contribution, budgetActual] = await Promise.all([
    getKpiSnapshot(requestedFy),
    getMonthlyTrend(requestedFy),
    getCommodityContribution(requestedFy),
    getBudgetVsActual(requestedFy),
  ]);

  const variationTrend = trendOfVariation(kpis?.variation);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Executive Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Karachi Division freight operations · top-line KPIs and trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions exportHref="/api/export/dashboard/executive" />
          <YearFilter fiscalYears={fiscalYears} current={requestedFy} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Wagons"
          value={kpis ? fmtInt(kpis.wagons) : "—"}
          hint="units loaded"
        />
        <KpiCard
          label="Total Tonnage"
          value={kpis ? fmtTonnage(kpis.tonnage) : "—"}
        />
        <KpiCard
          label="Freight Earnings"
          value={kpis ? fmtMillion(kpis.freight) : "—"}
        />
        <KpiCard
          label="Budget"
          value={kpis ? fmtMillion(kpis.budget) : "—"}
          hint="target for period"
        />
        <KpiCard
          label="Variation"
          value={kpis ? fmtSignedMillion(kpis.variation) : "—"}
          trend={variationTrend}
        />
        <KpiCard
          label="% Difference"
          value={kpis ? fmtPct(kpis.variation_pct) : "—"}
          trend={variationTrend}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly freight trend</CardTitle>
            <CardDescription>
              Total freight loaded per fiscal month (Jul → Jun).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FreightTrendChart data={trend} fiscalYear={requestedFy} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commodity contribution</CardTitle>
            <CardDescription>Share of total freight earnings.</CardDescription>
          </CardHeader>
          <CardContent>
            <CommodityDonut data={contribution} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top commodities</CardTitle>
            <CardDescription>By freight earnings.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopCommoditiesBar data={contribution} topN={5} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>
              Monthly freight earnings against budget target.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetActualChart data={budgetActual} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        Executive Overview
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>No data yet</CardTitle>
          <CardDescription>
            Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm ingest</code>{" "}
            from <code>apps/web</code> to load the freight data, then refresh.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
