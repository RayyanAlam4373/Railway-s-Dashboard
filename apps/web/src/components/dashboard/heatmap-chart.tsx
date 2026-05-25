"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { ChartShell, baseOption } from "./chart-shell";
import { fmtMillion } from "@/lib/dashboard/format";
import { FISCAL_MONTH_LABELS, type HeatmapCell } from "@/lib/dashboard/types";

type Props = {
  data: HeatmapCell[];
};

type TooltipParam = { value: [number, number, number]; name?: string };

export function HeatmapChart({ data }: Props) {
  const option = useMemo<EChartsOption>(() => {
    // Commodities along Y axis, fiscal months along X.
    const commodities = Array.from(
      new Set(data.map((d) => d.commodity)),
    ).slice(0, 20);

    const values: [number, number, number][] = data
      .filter((d) => commodities.includes(d.commodity))
      .map((d) => [
        d.fiscalMonth - 1,
        commodities.indexOf(d.commodity),
        Number(d.freight.toFixed(3)),
      ]);

    const max = values.reduce((m, v) => Math.max(m, v[2]), 0);

    return {
      ...baseOption,
      grid: { left: 8, right: 24, top: 16, bottom: 56, containLabel: true },
      tooltip: {
        position: "top",
        formatter: (params) => {
          const p = params as unknown as TooltipParam;
          const [xi, yi, v] = p.value;
          return `<strong>${commodities[yi]}</strong><br/>${FISCAL_MONTH_LABELS[xi]}: ${fmtMillion(v)}`;
        },
      },
      xAxis: {
        type: "category",
        data: FISCAL_MONTH_LABELS,
        axisLabel: { color: "#64748b" },
        splitArea: { show: true },
      },
      yAxis: {
        type: "category",
        data: commodities,
        axisLabel: { color: "#475569", fontSize: 11 },
        splitArea: { show: true },
      },
      visualMap: {
        min: 0,
        max: max || 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 8,
        itemHeight: 80,
        itemWidth: 10,
        textStyle: { color: "#64748b", fontSize: 10 },
        inRange: { color: ["#f1f5f9", "#0ea5e9", "#0f172a"] },
      },
      series: [
        {
          name: "Freight",
          type: "heatmap",
          data: values,
          label: { show: false },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(15,23,42,0.4)" },
          },
        },
      ],
    };
  }, [data]);

  return <ChartShell option={option} height={Math.max(360, 24 * Math.min(20, new Set(data.map((d) => d.commodity)).size) + 96)} />;
}
