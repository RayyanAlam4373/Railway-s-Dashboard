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
import { fmtMillion } from "@/lib/dashboard/format";
import { FISCAL_MONTH_LABELS, type MonthlyTrendPoint } from "@/lib/dashboard/types";

type Props = {
  data: MonthlyTrendPoint[];
  fiscalYear: string;
};

export function FreightTrendChart({ data, fiscalYear }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const series = FISCAL_MONTH_LABELS.map((_label, idx) => {
      const fm = idx + 1;
      const point = data.find((p) => p.fiscalMonth === fm);
      return point ? point.freight : null;
    });

    return {
      ...baseOption,
      color: [CHART_COLORS[0]],
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => fmtMillion(Number(v)),
      },
      xAxis: categoryAxis(FISCAL_MONTH_LABELS),
      yAxis: valueAxis("Freight (M)"),
      series: [
        {
          name: `FY ${fiscalYear}`,
          type: "line",
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(15,23,42,0.20)" },
                { offset: 1, color: "rgba(15,23,42,0.02)" },
              ],
            },
          },
          data: series,
          connectNulls: false,
        },
      ],
    };
  }, [data, fiscalYear]);

  return <ChartShell option={option} height={300} />;
}
