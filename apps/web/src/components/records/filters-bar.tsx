"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/datasets/registry";
import type { ClientDatasetConfig, LookupOption, LookupTable } from "@/lib/datasets/types";

type Props = {
  dataset: ClientDatasetConfig;
  lookups: Partial<Record<LookupTable, LookupOption[]>>;
};

export function FiltersBar({ dataset, lookups }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const yearField = dataset.fields.find((f) => f.kind === "year");
  const monthField = dataset.fields.find((f) => f.kind === "month");
  const lookupFields = dataset.fields.filter((f) => f.kind === "lookup");
  const fiscalYearField = dataset.fields.find((f) => f.kind === "fiscal_year");

  const setParam = (key: string, value: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all") sp.delete(key);
    else sp.set(key, value);
    sp.set("page", "1");
    startTransition(() => router.replace(`?${sp.toString()}`, { scroll: false }));
  };

  const clearAll = () => {
    startTransition(() => router.replace("?", { scroll: false }));
  };

  const anyActive = [...params.keys()].some((k) => k !== "page");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      {yearField && (
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Year
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            defaultValue={params.get("year") ?? ""}
            placeholder="Any"
            className="w-28"
            min={yearField.min}
            max={yearField.max}
            onBlur={(e) => setParam("year", e.target.value)}
          />
        </div>
      )}

      {monthField && (
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Month
          </Label>
          <Select
            defaultValue={params.get("month") ?? "all"}
            onValueChange={(v) => setParam("month", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {fiscalYearField && (
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Fiscal year
          </Label>
          <Input
            defaultValue={params.get("fiscal_year") ?? ""}
            placeholder="2025-2026"
            className="w-32"
            pattern="\d{4}-\d{4}"
            onBlur={(e) => setParam("fiscal_year", e.target.value)}
          />
        </div>
      )}

      {lookupFields.map((f) => {
        const options = (f.lookup && lookups[f.lookup.table]) ?? [];
        return (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {f.label}
            </Label>
            <Select
              defaultValue={params.get(f.key) ?? "all"}
              onValueChange={(v) => setParam(f.key, v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {anyActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={pending}
          className="self-end"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
