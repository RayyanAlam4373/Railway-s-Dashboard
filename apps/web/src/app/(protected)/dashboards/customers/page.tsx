import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ParetoChart } from "@/components/dashboard/pareto-chart";
import {
  TotalsTable,
  type TotalsColumn,
} from "@/components/dashboard/totals-table";
import { YearFilter } from "@/components/dashboard/year-filter";
import { ExportPrintActions } from "@/components/export-print-actions";
import { requireSession } from "@/lib/auth/session";
import { fmtInt, fmtMillion } from "@/lib/dashboard/format";
import {
  getAvailableFiscalYears,
  getPartnerPareto,
} from "@/lib/dashboard/queries";
import type { ParetoPoint } from "@/lib/dashboard/types";

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

export default async function CustomersDashboardPage({ searchParams }: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) return <EmptyState />;

  const fy = resolveFiscalYear(sp.fy, fiscalYears);
  const pareto = await getPartnerPareto(fy);

  const totalFreight = pareto.reduce((s, p) => s + p.freight, 0);
  const top3Share =
    totalFreight === 0
      ? 0
      : (pareto.slice(0, 3).reduce((s, p) => s + p.freight, 0) / totalFreight) *
        100;
  const partnersTo80 = pareto.findIndex((p) => p.cumulative_pct >= 80) + 1;

  type RankedRow = ParetoPoint & { rank: number };
  const ranked: RankedRow[] = pareto.map((p, i) => ({ ...p, rank: i + 1 }));

  const columns: TotalsColumn<RankedRow>[] = [
    { key: "rank", label: "#", render: (r) => String(r.rank) },
    { key: "party", label: "Partner", render: (r) => r.party },
    {
      key: "freight",
      label: "Freight",
      align: "right",
      render: (r) => fmtMillion(r.freight),
    },
    {
      key: "cumulative_pct",
      label: "Cum. %",
      align: "right",
      render: (r) => `${r.cumulative_pct.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Customer Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Logistics partner concentration, dependency risk and freight share.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions
            exportHref="/api/export/records/container-party"
          />
          <YearFilter fiscalYears={fiscalYears} current={fy} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <KpiCard label="Total partners" value={fmtInt(pareto.length)} />
        <KpiCard label="Total freight" value={fmtMillion(totalFreight)} />
        <KpiCard
          label="Top 3 share"
          value={`${top3Share.toFixed(1)}%`}
          hint="Concentration risk indicator"
          trend={top3Share > 60 ? "negative" : "neutral"}
        />
        <KpiCard
          label="Partners to 80%"
          value={partnersTo80 > 0 ? String(partnersTo80) : "—"}
          hint="Pareto: smaller = more concentrated"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Partner Pareto</CardTitle>
          <CardDescription>
            Freight per partner (bars) and cumulative share (line). 80% line
            marks the typical Pareto threshold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParetoChart data={pareto} topN={12} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All partners</CardTitle>
          <CardDescription>Sorted by freight contribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <TotalsTable
            rows={ranked}
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
        Customer Intelligence
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>No data yet</CardTitle>
          <CardDescription>
            Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm ingest</code>{" "}
            from <code>apps/web</code> to load partner data, then refresh.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
