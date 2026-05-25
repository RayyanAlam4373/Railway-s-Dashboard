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

type Props = {
  fiscalYears: string[];
  current: string;
};

export function YearFilter({ fiscalYears, current }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (value: string | null) => {
    if (value === null) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("fy", value);
    startTransition(() => router.replace(`?${sp.toString()}`, { scroll: false }));
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-44" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fiscalYears.map((fy) => (
          <SelectItem key={fy} value={fy}>
            FY {fy}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
