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
import { fmtMillion } from "@/lib/dashboard/format";
import type { ParetoPoint } from "@/lib/dashboard/types";

type Props = {
  data: ParetoPoint[];
  topN?: number;
};

export function ParetoChart({ data, topN = 12 }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const top = data.slice(0, topN);
    const names = top.map((p) => p.party);
    const freights = top.map((p) => p.freight);
    const cumulativePct = top.map((p) => Number(p.cumulative_pct.toFixed(2)));

    return {
      ...baseOption,
      grid: { left: 48, right: 56, top: 32, bottom: 96, containLabel: true },
      color: [CHART_COLORS[0], CHART_COLORS[3]],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const arr = params as unknown as Array<{
            seriesName: string;
            value: number;
            axisValue: string;
          }>;
          const freight = arr.find((x) => x.seriesName === "Freight")?.value ?? 0;
          const cum = arr.find((x) => x.seriesName === "Cumulative %")?.value ?? 0;
          return `<strong>${arr[0]?.axisValue}</strong><br/>${fmtMillion(freight)}<br/>Cumulative: ${cum.toFixed(1)}%`;
        },
      },
      legend: {
        data: ["Freight", "Cumulative %"],
        bottom: 0,
        textStyle: { color: "#475569", fontSize: 11 },
      },
      xAxis: {
        ...categoryAxis(names),
        axisLabel: { color: "#64748b", interval: 0, rotate: 35, fontSize: 10 },
      },
      yAxis: [
        valueAxis("Freight (M)"),
        {
          ...valueAxis("Cumulative %"),
          position: "right",
          min: 0,
          max: 100,
          axisLabel: { color: "#64748b", formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Freight",
          type: "bar",
          data: freights,
          yAxisIndex: 0,
          barWidth: 18,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Cumulative %",
          type: "line",
          data: cumulativePct,
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2 },
          markLine: {
            silent: true,
            symbol: ["none", "none"],
            lineStyle: {
              type: "dashed",
              color: "#94a3b8",
              width: 1,
            },
            label: {
              formatter: "80%",
              position: "insideEndTop",
              color: "#64748b",
              fontSize: 10,
            },
            data: [{ yAxis: 80 }],
          },
        },
      ],
    };
  }, [data, topN]);

  return <ChartShell option={option} height={380} />;
}
