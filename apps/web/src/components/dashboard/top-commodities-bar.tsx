"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { ChartShell, CHART_COLORS, baseOption } from "./chart-shell";
import { fmtMillion } from "@/lib/dashboard/format";
import type { CommodityContribution } from "@/lib/dashboard/types";

type Props = {
  data: CommodityContribution[];
  topN?: number;
};

export function TopCommoditiesBar({ data, topN = 5 }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const top = [...data]
      .filter((d) => d.freight > 0)
      .sort((a, b) => b.freight - a.freight)
      .slice(0, topN)
      .reverse();
    const names = top.map((d) => d.commodity);
    const values = top.map((d) => d.freight);

    return {
      ...baseOption,
      color: [CHART_COLORS[1]],
      grid: { left: 12, right: 72, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => fmtMillion(Number(v)),
      },
      xAxis: {
        type: "value",
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#475569", fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: values,
          barWidth: 18,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: "right",
            color: "#0f172a",
            formatter: (p) => fmtMillion(Number(p.value)),
            fontSize: 11,
          },
        },
      ],
    };
  }, [data, topN]);

  return <ChartShell option={option} height={260} />;
}
