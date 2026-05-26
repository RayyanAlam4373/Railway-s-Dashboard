"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { ChartShell, CHART_COLORS, baseOption } from "./chart-shell";
import { fmtMillion } from "@/lib/dashboard/format";

type Props = {
  data: { commodity: string; freight: number }[];
};

export function CommodityDonut({ data }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const sorted = [...data]
      .filter((d) => d.freight > 0)
      .sort((a, b) => b.freight - a.freight);
    const top = sorted.slice(0, 8);
    const restTotal = sorted.slice(8).reduce((s, r) => s + r.freight, 0);
    const series = [
      ...top.map((d) => ({ name: d.commodity, value: d.freight })),
      ...(restTotal > 0 ? [{ name: "Other", value: restTotal }] : []),
    ];
    const total = series.reduce((s, r) => s + r.value, 0);

    return {
      ...baseOption,
      color: CHART_COLORS,
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const p = params as { name: string; value: number; percent: number };
          return `<strong>${p.name}</strong><br/>${fmtMillion(p.value)} (${p.percent.toFixed(1)}%)`;
        },
      },
      legend: {
        type: "scroll",
        orient: "horizontal",
        bottom: 0,
        left: "center",
        textStyle: { fontSize: 11, color: "#475569" },
        itemHeight: 8,
        itemWidth: 8,
        pageIconSize: 10,
        pageTextStyle: { fontSize: 10, color: "#64748b" },
      },
      graphic: {
        type: "text",
        left: "center",
        top: "38%",
        style: {
          text: fmtMillion(total),
          fill: "#0f172a",
          font: "600 16px var(--font-geist-sans), Inter, sans-serif",
          textAlign: "center",
          textVerticalAlign: "middle",
        },
      },
      series: [
        {
          name: "Freight",
          type: "pie",
          radius: ["45%", "65%"],
          center: ["50%", "42%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 3,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: { show: false },
          labelLine: { show: false },
          data: series,
        },
      ],
    };
  }, [data]);

  return <ChartShell option={option} height={300} />;
}
