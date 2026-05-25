"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import {
  ChartShell,
  CHART_COLORS,
  baseOption,
  categoryAxis,
  valueAxis,
} from "./chart-shell";
import { fmtMillion, fmtSignedMillion } from "@/lib/dashboard/format";
import {
  FISCAL_MONTH_LABELS,
  type BudgetVsActualPoint,
} from "@/lib/dashboard/types";

type Props = {
  data: BudgetVsActualPoint[];
};

type TooltipParam = { seriesName: string; value: number; axisValue: string };

export function BudgetActualChart({ data }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const byMonth = new Map(data.map((d) => [d.fiscalMonth, d]));
    const actuals = FISCAL_MONTH_LABELS.map(
      (_l, i) => byMonth.get(i + 1)?.actual ?? null,
    );
    const budgets = FISCAL_MONTH_LABELS.map(
      (_l, i) => byMonth.get(i + 1)?.budget ?? null,
    );

    return {
      ...baseOption,
      color: [CHART_COLORS[0], CHART_COLORS[3]],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const arr = (
            Array.isArray(params) ? params : [params]
          ) as unknown as TooltipParam[];
          if (!arr.length) return "";
          const actual = arr.find((x) => x.seriesName === "Actual")?.value ?? 0;
          const budget = arr.find((x) => x.seriesName === "Budget")?.value ?? 0;
          const variance = actual - budget;
          return `
            <strong>${arr[0].axisValue}</strong><br/>
            Actual: ${fmtMillion(actual)}<br/>
            Budget: ${fmtMillion(budget)}<br/>
            <span style="color:${variance >= 0 ? "#16a34a" : "#dc2626"}">
              Variance: ${fmtSignedMillion(variance)}
            </span>
          `;
        },
      },
      legend: {
        data: ["Actual", "Budget"],
        bottom: 0,
        textStyle: { color: "#475569", fontSize: 11 },
      },
      xAxis: categoryAxis(FISCAL_MONTH_LABELS),
      yAxis: valueAxis("Freight (M)"),
      series: [
        {
          name: "Actual",
          type: "bar",
          data: actuals,
          barWidth: 14,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Budget",
          type: "bar",
          data: budgets,
          barWidth: 14,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [data]);

  return <ChartShell option={option} height={320} />;
}
