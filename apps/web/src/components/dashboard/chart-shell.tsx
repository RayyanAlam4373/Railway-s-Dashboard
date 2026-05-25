"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsOption, XAXisComponentOption, YAXisComponentOption } from "echarts";

type Props = {
  option: EChartsOption;
  height?: number;
};

export function ChartShell({ option, height = 320 }: Props) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height: `${height}px`, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}

export const CHART_COLORS = [
  "#0f172a",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f472b6",
  "#84cc16",
  "#6366f1",
];

const AXIS_LABEL = "#64748b";
const AXIS_LINE = "#e2e8f0";
const SPLIT_LINE = "#f1f5f9";

export const baseOption: Partial<EChartsOption> = {
  textStyle: { fontFamily: "var(--font-geist-sans), Inter, sans-serif" },
  grid: { left: 48, right: 24, top: 32, bottom: 32, containLabel: true },
};

export function categoryAxis(data: string[]): XAXisComponentOption {
  return {
    type: "category",
    data,
    axisLabel: { color: AXIS_LABEL },
    axisLine: { lineStyle: { color: AXIS_LINE } },
  };
}

export function valueAxis(name?: string): YAXisComponentOption {
  return {
    type: "value",
    ...(name
      ? { name, nameTextStyle: { color: AXIS_LABEL, fontSize: 11 } }
      : {}),
    axisLabel: { color: AXIS_LABEL },
    splitLine: { lineStyle: { color: SPLIT_LINE } },
  };
}
