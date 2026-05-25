"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import {
  CHART_COLORS,
  ChartShell,
  baseOption,
  categoryAxis,
  valueAxis,
} from "./chart-shell";
import { fmtInt, fmtMillion } from "@/lib/dashboard/format";
import {
  FISCAL_MONTH_LABELS,
  type ThroughputPoint,
} from "@/lib/dashboard/types";

type Props = {
  data: ThroughputPoint[];
};

export function ThroughputChart({ data }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const byMonth = new Map(data.map((d) => [d.fiscalMonth, d]));
    const teus = FISCAL_MONTH_LABELS.map(
      (_l, i) => byMonth.get(i + 1)?.teus ?? null,
    );
    const freight = FISCAL_MONTH_LABELS.map(
      (_l, i) => byMonth.get(i + 1)?.freight ?? null,
    );

    return {
      ...baseOption,
      color: [CHART_COLORS[1], CHART_COLORS[0]],
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const arr = params as unknown as Array<{
            seriesName: string;
            value: number;
            axisValue: string;
          }>;
          const t = arr.find((x) => x.seriesName === "TEUs")?.value ?? 0;
          const f = arr.find((x) => x.seriesName === "Freight")?.value ?? 0;
          return `<strong>${arr[0]?.axisValue}</strong><br/>TEUs: ${fmtInt(t)}<br/>Freight: ${fmtMillion(f)}`;
        },
      },
      legend: {
        data: ["TEUs", "Freight"],
        bottom: 0,
        textStyle: { color: "#475569", fontSize: 11 },
      },
      xAxis: categoryAxis(FISCAL_MONTH_LABELS),
      yAxis: [
        valueAxis("TEUs"),
        { ...valueAxis("Freight (M)"), position: "right" },
      ],
      series: [
        {
          name: "TEUs",
          type: "bar",
          data: teus,
          yAxisIndex: 0,
          barWidth: 16,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Freight",
          type: "line",
          data: freight,
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2 },
        },
      ],
    };
  }, [data]);

  return <ChartShell option={option} height={320} />;
}
