import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TotalsColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  rows: T[];
  columns: TotalsColumn<T>[];
  emptyMessage?: string;
  linkFor?: (row: T) => { href: string; label?: string } | null;
};

export function TotalsTable<T extends object>({
  rows,
  columns,
  emptyMessage = "No data.",
  linkFor,
}: Props<T>) {
  const cols = linkFor
    ? [
        ...columns,
        {
          key: "__link",
          label: "",
          align: "right" as const,
          render: (row: T) => {
            const l = linkFor(row);
            if (!l) return null;
            return (
              <Link
                href={l.href}
                className="text-xs font-medium text-primary hover:underline"
              >
                {l.label ?? "View →"}
              </Link>
            );
          },
        },
      ]
    : columns;

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead
                key={c.key}
                className={`text-xs uppercase tracking-wide ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={cols.length}
                className="h-20 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                {cols.map((c) => (
                  <TableCell
                    key={c.key}
                    className={`tabular-nums ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
