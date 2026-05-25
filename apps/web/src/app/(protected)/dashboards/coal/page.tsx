import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FreightTrendChart } from "@/components/dashboard/freight-trend-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TotalsTable,
  type TotalsColumn,
} from "@/components/dashboard/totals-table";
import { TreemapChart } from "@/components/dashboard/treemap-chart";
import { YearFilter } from "@/components/dashboard/year-filter";
import { ExportPrintActions } from "@/components/export-print-actions";
import { requireSession } from "@/lib/auth/session";
import { fmtInt, fmtMillion, fmtTonnage } from "@/lib/dashboard/format";
import {
  getAvailableFiscalYears,
  getCoalMonthlyTrend,
  getCoalPartyTotals,
  getCoalSubcategoryTotals,
} from "@/lib/dashboard/queries";
import type {
  CoalPartyTotal,
  CoalSubcategoryTotal,
} from "@/lib/dashboard/types";

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

export default async function CoalDashboardPage({ searchParams }: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) return <EmptyState />;

  const fy = resolveFiscalYear(sp.fy, fiscalYears);

  const [subcategories, trend, parties] = await Promise.all([
    getCoalSubcategoryTotals(fy),
    getCoalMonthlyTrend(fy),
    getCoalPartyTotals(fy),
  ]);

  const totalWagons = subcategories.reduce((s, r) => s + r.wagons, 0);
  const totalTonnage = subcategories.reduce((s, r) => s + r.tonnage, 0);
  const totalFreight = subcategories.reduce((s, r) => s + r.freight, 0);

  const subColumns: TotalsColumn<CoalSubcategoryTotal>[] = [
    { key: "commodity", label: "Subcategory", render: (r) => r.commodity },
    {
      key: "wagons",
      label: "Wagons",
      align: "right",
      render: (r) => fmtInt(r.wagons),
    },
    {
      key: "tonnage",
      label: "Tonnage",
      align: "right",
      render: (r) => fmtTonnage(r.tonnage),
    },
    {
      key: "freight",
      label: "Freight",
      align: "right",
      render: (r) => fmtMillion(r.freight),
    },
  ];

  const partyColumns: TotalsColumn<CoalPartyTotal>[] = [
    { key: "party", label: "Party", render: (r) => r.party },
    {
      key: "wagons",
      label: "Wagons",
      align: "right",
      render: (r) => fmtInt(r.wagons),
    },
    {
      key: "tonnage",
      label: "Tonnage",
      align: "right",
      render: (r) => (r.tonnage === null ? "—" : fmtTonnage(r.tonnage)),
    },
    {
      key: "freight",
      label: "Freight",
      align: "right",
      render: (r) => (r.freight === null ? "—" : fmtMillion(r.freight)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Coal Segment
          </h1>
          <p className="text-sm text-muted-foreground">
            YSW, AKDD and other coal sub-streams plus customer-level
            allocations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions exportHref="/api/export/records/coal-party" />
          <YearFilter fiscalYears={fiscalYears} current={fy} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Coal wagons" value={fmtInt(totalWagons)} />
        <KpiCard label="Coal tonnage" value={fmtTonnage(totalTonnage)} />
        <KpiCard label="Coal freight" value={fmtMillion(totalFreight)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly coal freight</CardTitle>
            <CardDescription>
              Total coal freight earnings per fiscal month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FreightTrendChart data={trend} fiscalYear={fy} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sub-stream share</CardTitle>
            <CardDescription>YSW, AKDD, Other.</CardDescription>
          </CardHeader>
          <CardContent>
            <TreemapChart
              data={subcategories.map((s) => ({
                name: s.commodity,
                value: s.freight,
              }))}
              height={300}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sub-streams</CardTitle>
            <CardDescription>From commodity_monthly.</CardDescription>
          </CardHeader>
          <CardContent>
            <TotalsTable
              rows={subcategories}
              columns={subColumns}
              linkFor={(r) => ({
                href: `/records/commodity-monthly?commodity_id=${r.commodity_id}`,
              })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer parties</CardTitle>
            <CardDescription>From coal_party_monthly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertTitle>Partial data</AlertTitle>
              <AlertDescription>
                The source xlsx (<code>Coal Party wise 2025-2026 JUL-APR.xlsx</code>)
                only ships the Wagon column — Tonnage and Freight are blank in
                the ingest until the client backfills. Records can still be
                added manually through the form.
              </AlertDescription>
            </Alert>
            <TotalsTable
              rows={parties}
              columns={partyColumns}
              emptyMessage="No coal-party records yet. Add one from the Records tab."
              linkFor={(r) => ({
                href: `/records/coal-party?party_id=${r.party_id}`,
              })}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Coal Segment</h1>
      <Card>
        <CardHeader>
          <CardTitle>No data yet</CardTitle>
          <CardDescription>
            Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm ingest</code>{" "}
            from <code>apps/web</code> to load freight data, then refresh.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
