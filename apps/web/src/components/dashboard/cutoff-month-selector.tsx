"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FISCAL_MONTH_LABELS } from "@/lib/dashboard/types";

type Props = {
  // Largest fiscal-month index (1..12) for which we have data.
  maxFiscalMonth: number;
  current: number;
};

export function CutoffMonthSelector({ maxFiscalMonth, current }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (value: string | null) => {
    if (value === null) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("through", value);
    startTransition(() => router.replace(`?${sp.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        Through
      </span>
      <Select value={String(current)} onValueChange={onChange}>
        <SelectTrigger className="w-36" disabled={pending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FISCAL_MONTH_LABELS.slice(0, maxFiscalMonth).map((label, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
