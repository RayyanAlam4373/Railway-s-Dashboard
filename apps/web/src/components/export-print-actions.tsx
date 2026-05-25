"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  // Full path of the xlsx export endpoint, e.g. "/api/export/dashboard/executive".
  exportHref: string;
  // Whether to forward the current querystring (filters, fy, etc.) to the
  // export endpoint so the download matches what the user sees.
  forwardSearch?: boolean;
  showPrint?: boolean;
};

export function ExportPrintActions({
  exportHref,
  forwardSearch = true,
  showPrint = true,
}: Props) {
  const params = useSearchParams();
  const href = forwardSearch
    ? `${exportHref}${params.toString() ? `?${params.toString()}` : ""}`
    : exportHref;

  return (
    <div className="flex items-center gap-2 print:hidden">
      <a
        href={href}
        className="inline-flex h-7 items-center rounded-md border bg-card px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted"
        download
      >
        Export xlsx
      </a>
      {showPrint && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          type="button"
        >
          Print / PDF
        </Button>
      )}
    </div>
  );
}
