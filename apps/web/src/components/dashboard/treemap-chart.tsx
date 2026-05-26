"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { ChartShell, CHART_COLORS, baseOption } from "./chart-shell";
import { fmtMillion } from "@/lib/dashboard/format";

type Props = {
  data: { name: string; value: number }[];
  height?: number;
};

export function TreemapChart({ data, height = 360 }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const filtered = data.filter((d) => d.value > 0);
    return {
      ...baseOption,
      color: CHART_COLORS,
      tooltip: {
        formatter: (params) => {
          const p = params as { name: string; value: number };
          return `<strong>${p.name}</strong><br/>${fmtMillion(p.value)}`;
        },
      },
      series: [
        {
          type: "treemap",
          data: filtered,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: "{b}",
            fontSize: 11,
            color: "#fff",
            overflow: "truncate",
            ellipsis: "…",
          },
          itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
          levels: [
            {
              itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
              colorSaturation: [0.5, 0.9],
            },
          ],
        },
      ],
    };
  }, [data]);

  return <ChartShell option={option} height={height} />;
}
