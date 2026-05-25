import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportPrintActions } from "@/components/export-print-actions";
import { FiltersBar } from "@/components/records/filters-bar";
import { FlashToast } from "@/components/records/flash-toast";
import { RecordTable } from "@/components/records/record-table";
import { canDeleteFacts, canWriteFacts, requireSession } from "@/lib/auth/session";
import { buildLookupMap } from "@/lib/datasets/format";
import { listRecords, loadLookups } from "@/lib/datasets/queries";
import { getDataset } from "@/lib/datasets/registry";
import { toClientDataset } from "@/lib/datasets/types";

type PageProps = {
  params: Promise<{ dataset: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DatasetListPage({ params, searchParams }: PageProps) {
  const session = await requireSession();
  const { dataset: slug } = await params;
  const sp = await searchParams;

  const dataset = getDataset(slug);
  if (!dataset) notFound();

  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (typeof v === "string") filters[k] = v;
  }
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [result, lookups] = await Promise.all([
    listRecords(dataset, { page, filters }),
    loadLookups(dataset.lookups),
  ]);
  const lookupMap = buildLookupMap(lookups);

  const searchString = new URLSearchParams(
    Object.entries(filters).map(([k, v]) => [k, String(v)]),
  ).toString();

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/records"
            className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            ← All records
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {dataset.title}
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            {dataset.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportPrintActions
            exportHref={`/api/export/records/${dataset.slug}`}
            showPrint={false}
          />
          {canWriteFacts(session.role) && (
            <Link
              href={`/records/${dataset.slug}/new`}
              className={buttonVariants()}
            >
              + New record
            </Link>
          )}
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-16" />}>
        <FiltersBar dataset={toClientDataset(dataset)} lookups={lookups} />
      </Suspense>

      <RecordTable
        dataset={toClientDataset(dataset)}
        rows={result.rows}
        lookups={lookupMap}
        canEdit={canWriteFacts(session.role)}
        canDelete={canDeleteFacts(session.role)}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        searchString={searchString}
      />
    </div>
  );
}
