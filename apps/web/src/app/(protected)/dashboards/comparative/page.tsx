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
import { CutoffMonthSelector } from "@/components/dashboard/cutoff-month-selector";
import {
  TotalsTable,
  type TotalsColumn,
} from "@/components/dashboard/totals-table";
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
  getComparativeFiscalYears,
  getLatestFiscalMonth,
  getPeriodRollup,
  getYoyComparison,
} from "@/lib/dashboard/queries";
import {
  FISCAL_MONTH_LABELS,
  fiscalYearToCalendarYears,
  type PeriodRollupRow,
  type YoyRow,
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

function priorFiscalYear(fy: string): string {
  const { startYear } = fiscalYearToCalendarYears(fy);
  return `${startYear - 1}-${startYear}`;
}

export default async function ComparativeDashboardPage({ searchParams }: PageProps) {
  await requireSession();
  const sp = await searchParams;

  const fiscalYears = await getAvailableFiscalYears();
  if (fiscalYears.length === 0) return <EmptyState />;

  const fy = resolveFiscalYear(sp.fy, fiscalYears);
  const latestFm = await getLatestFiscalMonth(fy);

  const requestedThrough = Number(sp.through);
  const through =
    Number.isFinite(requestedThrough) &&
    requestedThrough >= 1 &&
    requestedThrough <= latestFm
      ? requestedThrough
      : latestFm;

  const comparativeYears = await getComparativeFiscalYears();
  const prior = priorFiscalYear(fy);
  const hasPriorYear = comparativeYears.includes(prior);

  const [rollup, yoy] = await Promise.all([
    getPeriodRollup(fy, through),
    hasPriorYear ? getYoyComparison(fy, prior) : Promise.resolve([] as YoyRow[]),
  ]);

  const rollupColumns: TotalsColumn<PeriodRollupRow>[] = [
    { key: "commodity", label: "Commodity", render: (r) => r.commodity },
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

  const yoyColumns: TotalsColumn<YoyRow>[] = [
    { key: "commodity", label: "Commodity", render: (r) => r.commodity },
    {
      key: "current_freight",
      label: `Freight ${fy}`,
      align: "right",
      render: (r) => fmtMillion(r.current_freight),
    },
    {
      key: "prior_freight",
      label: `Freight ${prior}`,
      align: "right",
      render: (r) => fmtMillion(r.prior_freight),
    },
    {
      key: "freight_delta",
      label: "Δ Freight",
      align: "right",
      render: (r) => (
        <span
          className={
            r.freight_delta > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : r.freight_delta < 0
                ? "text-destructive"
                : ""
          }
        >
          {fmtSignedMillion(r.freight_delta)}
        </span>
      ),
    },
    {
      key: "freight_delta_pct",
      label: "Δ %",
      align: "right",
      render: (r) => (
        <span
          className={
            r.freight_delta_pct === null || r.freight_delta_pct === 0
              ? ""
              : r.freight_delta_pct > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
          }
        >
          {fmtPct(r.freight_delta_pct)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Comparative
          </h1>
          <p className="text-sm text-muted-foreground">
            Period rollups and year-over-year comparison. Replaces the six
            redundant cutoff sheets in the source xlsx.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPrintActions exportHref="/api/export/records/comparative" />
          <CutoffMonthSelector maxFiscalMonth={latestFm} current={through} />
          <YearFilter fiscalYears={fiscalYears} current={fy} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Period rollup — FY {fy}, Jul → {FISCAL_MONTH_LABELS[through - 1]}
          </CardTitle>
          <CardDescription>
            Cumulative totals per commodity for the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TotalsTable
            rows={rollup}
            columns={rollupColumns}
            linkFor={(r) => ({
              href: `/records/commodity-monthly?commodity_id=${r.commodity_id}`,
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Year-over-Year — {fy} vs {prior}
          </CardTitle>
          <CardDescription>
            Full-period (Jul-Apr) freight comparison. Largest absolute swings
            first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasPriorYear && (
            <Alert>
              <AlertTitle>No prior-year data</AlertTitle>
              <AlertDescription>
                <code>comparative_yearly</code> does not yet contain rows for
                FY {prior}. Add records through the Comparative form or run the
                ingest script after the client provides prior-year data.
              </AlertDescription>
            </Alert>
          )}
          {hasPriorYear && (
            <TotalsTable
              rows={yoy}
              columns={yoyColumns}
              linkFor={(r) => ({
                href: `/records/comparative?commodity_id=${r.commodity_id}`,
              })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Comparative</h1>
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
