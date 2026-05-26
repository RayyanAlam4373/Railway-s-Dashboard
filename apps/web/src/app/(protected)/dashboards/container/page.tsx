import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import {
  TotalsTable,
  type TotalsColumn,
} from "@/components/dashboard/totals-table";
import { TreemapChart } from "@/components/dashboard/treemap-chart";
import { YearFilter } from "@/components/dashboard/year-filter";
import { ExportPrintActions } from "@/components/export-print-actions";
import { requireSession } from "@/lib/auth/session";
import { fmtInt, fmtMillion } from "@/lib/dashboard/format";
import {
  getAvailableFiscalYears,
  getContainerPartyTotals,
  getContainerThroughput,
} from "@/lib/dashboard/queries";
import type { PartnerTotal } from "@/lib/dashboard/types";

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

function topPartnersWithOther(
  partners: PartnerTotal[],
  topN: number,
): { name: string; value: number }[] {
  const sorted = [...partners]
    .filter((p) => p.freight > 0)
    .sort((a, b) => b.freight - a.freight);
  const top = sorted.slice(0, topN);
  const restTotal = sorted.slice(topN).reduce((s, p) => s + p.freight, 0);
  const result = top.map((p) => ({ name: p.party, value: p.freight }));
  if (restTotal > 0) result.push({ name: "Other", value: restTotal });
  return result;
}

export default async function ContainerDashboardPage({
  searchParams,
}: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) return <EmptyState />;

  const fy = resolveFiscalYear(sp.fy, fiscalYears);

  const [partners, throughput] = await Promise.all([
    getContainerPartyTotals(fy),
    getContainerThroughput(fy),
  ]);

  const totalTeus = partners.reduce((s, p) => s + p.teus, 0);
  const totalFreight = partners.reduce((s, p) => s + p.freight, 0);
  const top3Share =
    totalFreight === 0
      ? 0
      : (partners.slice(0, 3).reduce((s, p) => s + p.freight, 0) /
          totalFreight) *
        100;

  const columns: TotalsColumn<PartnerTotal>[] = [
    { key: "party", label: "Party", render: (r) => r.party },
    {
      key: "teus",
      label: "TEUs",
      align: "right",
      render: (r) => fmtInt(r.teus),
    },
    {
      key: "freight",
      label: "Freight",
      align: "right",
      render: (r) => fmtMillion(r.freight),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Container Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            TEUs and freight per logistics partner / terminal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions
            exportHref="/api/export/records/container-party"
          />
          <YearFilter fiscalYears={fiscalYears} current={fy} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total TEUs" value={fmtInt(totalTeus)} />
        <KpiCard label="Total freight" value={fmtMillion(totalFreight)} />
        <KpiCard
          label="Top 3 partner share"
          value={`${top3Share.toFixed(1)}%`}
          hint="Concentration risk indicator"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly throughput</CardTitle>
            <CardDescription>
              TEUs handled and freight earned per fiscal month across all
              container partners.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThroughputChart data={throughput} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partner share</CardTitle>
            <CardDescription>
              Top 8 partners by freight; smaller partners grouped as Other.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TreemapChart
              data={topPartnersWithOther(partners, 8)}
              height={360}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>All partners</CardTitle>
          <CardDescription>Sorted by freight earnings.</CardDescription>
        </CardHeader>
        <CardContent>
          <TotalsTable
            rows={partners}
            columns={columns}
            linkFor={(r) => ({
              href: `/records/container-party?party_id=${r.party_id}`,
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        Container Operations
      </h1>
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
