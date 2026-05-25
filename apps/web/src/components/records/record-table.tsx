"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtInt } from "@/lib/dashboard/format";
import { formatCell, type LookupMap } from "@/lib/datasets/format";
import type { ClientDatasetConfig } from "@/lib/datasets/types";
import { DeleteRecordButton } from "./delete-button";

function PagerLink({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (enabled) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <span className={cn(className, "pointer-events-none opacity-50")}>
      {label}
    </span>
  );
}

export type RecordTableProps = {
  dataset: ClientDatasetConfig;
  rows: Record<string, unknown>[];
  lookups: LookupMap;
  canEdit: boolean;
  canDelete: boolean;
  page: number;
  pageCount: number;
  total: number;
  // The current querystring (so pagination links preserve filters).
  searchString: string;
};

export function RecordTable({
  dataset,
  rows,
  lookups,
  canEdit,
  canDelete,
  page,
  pageCount,
  total,
  searchString,
}: RecordTableProps) {
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const fieldColumns: ColumnDef<Record<string, unknown>>[] = dataset.fields.map(
      (f) => ({
        id: f.key,
        header: f.label,
        accessorFn: (row) => row[f.key],
        cell: (info) => formatCell(f, info.getValue(), lookups),
      }),
    );
    if (canEdit || canDelete) {
      fieldColumns.push({
        id: "actions",
        header: "",
        cell: (info) => {
          const id = String(info.row.original.id);
          return (
            <div className="flex justify-end gap-1">
              {canEdit && (
                <Link
                  href={`/records/${dataset.slug}/${id}/edit`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Edit
                </Link>
              )}
              {canDelete && (
                <DeleteRecordButton datasetSlug={dataset.slug} recordId={id} />
              )}
            </div>
          );
        },
      });
    }
    return fieldColumns;
  }, [dataset, lookups, canEdit, canDelete]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const baseHref = `/records/${dataset.slug}`;
  const buildPageHref = (target: number) => {
    const sp = new URLSearchParams(searchString);
    sp.set("page", String(target));
    return `${baseHref}?${sp.toString()}`;
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-xs uppercase tracking-wide">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((r) => (
                <TableRow key={r.id}>
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id} className="tabular-nums">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{fmtInt(total)} total</Badge>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>
        <div className="flex gap-1">
          <PagerLink
            href={buildPageHref(page - 1)}
            enabled={page > 1}
            label="Previous"
          />
          <PagerLink
            href={buildPageHref(page + 1)}
            enabled={page < pageCount}
            label="Next"
          />
        </div>
      </div>
    </div>
  );
}
