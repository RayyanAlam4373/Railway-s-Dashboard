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
import {
  FISCAL_MONTH_LABELS,
  type CommodityTrend,
} from "@/lib/dashboard/types";

type Props = {
  trends: CommodityTrend[];
  topN?: number;
};

export function CommodityTrendsLines({ trends, topN = 6 }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const top = trends.slice(0, topN);
    const series = top.map((t, idx) => {
      const byFiscalMonth = new Map(
        t.points.map((p) => [p.fiscalMonth, p.freight]),
      );
      const data = FISCAL_MONTH_LABELS.map(
        (_l, i) => byFiscalMonth.get(i + 1) ?? null,
      );
      return {
        name: t.commodity,
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: CHART_COLORS[idx % CHART_COLORS.length] },
        data,
        connectNulls: false,
      };
    });

    return {
      ...baseOption,
      grid: { left: 48, right: 24, top: 32, bottom: 56, containLabel: true },
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => fmtMillion(Number(v)),
      },
      legend: {
        data: top.map((t) => t.commodity),
        bottom: 0,
        textStyle: { color: "#475569", fontSize: 11 },
      },
      xAxis: categoryAxis(FISCAL_MONTH_LABELS),
      yAxis: valueAxis("Freight (M)"),
      series,
    };
  }, [trends, topN]);

  return <ChartShell option={option} height={340} />;
}
