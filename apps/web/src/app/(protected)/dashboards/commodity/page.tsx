import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommodityTrendsLines } from "@/components/dashboard/commodity-trends-lines";
import { HeatmapChart } from "@/components/dashboard/heatmap-chart";
import { TotalsTable, type TotalsColumn } from "@/components/dashboard/totals-table";
import { YearFilter } from "@/components/dashboard/year-filter";
import { ExportPrintActions } from "@/components/export-print-actions";
import { requireSession } from "@/lib/auth/session";
import { fmtInt, fmtMillion, fmtPct } from "@/lib/dashboard/format";
import {
  getAvailableFiscalYears,
  getCommodityContribution,
  getCommodityHeatmap,
  getCommodityTrends,
} from "@/lib/dashboard/queries";
import type { CommodityContribution } from "@/lib/dashboard/types";

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

export default async function CommodityDashboardPage({
  searchParams,
}: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) return <EmptyState />;

  const fy = resolveFiscalYear(sp.fy, fiscalYears);

  const [contribution, trends, heatmap] = await Promise.all([
    getCommodityContribution(fy),
    getCommodityTrends(fy),
    getCommodityHeatmap(fy),
  ]);

  const columns: TotalsColumn<CommodityContribution>[] = [
    { key: "commodity", label: "Commodity", render: (r) => r.commodity },
    { key: "wagons", label: "Wagons", align: "right", render: (r) => fmtInt(r.wagons) },
    { key: "freight", label: "Freight", align: "right", render: (r) => fmtMillion(r.freight) },
    {
      key: "freight_pct",
      label: "Freight %",
      align: "right",
      render: (r) => fmtPct(r.freight_pct),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Commodity Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Per-commodity trends, seasonal patterns and contribution to total
            freight.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions
            exportHref={`/api/export/records/commodity-monthly`}
          />
          <YearFilter fiscalYears={fiscalYears} current={fy} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top commodities — monthly trend</CardTitle>
            <CardDescription>
              Freight earnings per fiscal month for the 6 largest commodities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommodityTrendsLines trends={trends} topN={6} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking</CardTitle>
            <CardDescription>
              All commodities, sorted by freight earnings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TotalsTable
              rows={contribution}
              columns={columns}
              linkFor={(r) => ({
                href: `/records/commodity-monthly?commodity_id=${r.commodity_id}`,
              })}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal heatmap</CardTitle>
          <CardDescription>
            Freight intensity per commodity × fiscal month. Darker = higher
            earnings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapChart data={heatmap} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        Commodity Intelligence
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
