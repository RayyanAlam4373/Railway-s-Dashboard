"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshAlertsAction } from "./actions";

export function RefreshAlertsButton({ canRefresh }: { canRefresh: boolean }) {
  const [pending, startTransition] = useTransition();
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  if (!canRefresh) return null;

  const onClick = () => {
    startTransition(async () => {
      const r = await refreshAlertsAction();
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      const { inserted, updated } = r.result;
      const summary =
        inserted === 0 && updated === 0
          ? `No new issues for FY ${r.fiscalYear}.`
          : `FY ${r.fiscalYear}: ${inserted} new, ${updated} updated.`;
      setLastSummary(summary);
      toast.success(summary);
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {lastSummary && <span>{lastSummary}</span>}
      <Button onClick={onClick} disabled={pending} size="sm" variant="outline">
        {pending ? "Refreshing…" : "Refresh alerts"}
      </Button>
    </div>
  );
}
