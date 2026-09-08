"use client";

import React from "react";

interface StatusItem {
  label: string;
  count: number;
  color: string;
}

interface DonutChartProps {
  items: StatusItem[];
  totalLabel?: string;
}

export function DonutChart({ items, totalLabel = "Total Tasks" }: DonutChartProps) {
  const total = items.reduce((acc, curr) => acc + curr.count, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = items.map((item) => {
    const percent = total > 0 ? item.count / total : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    const endPercent = cumulativePercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData =
      total > 0 && percent > 0
        ? `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`
        : "";

    return { ...item, percent, pathData };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl bg-surface border border-border">
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90 transform">
          {slices.map((slice, i) =>
            slice.pathData ? (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                className="transition-opacity duration-150 hover:opacity-80 cursor-pointer"
              />
            ) : null
          )}
          {total === 0 && <circle cx="0" cy="0" r="1" fill="var(--color-hover)" />}
          <circle cx="0" cy="0" r="0.68" fill="var(--color-chart-hole)" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted font-medium">{totalLabel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 flex-1 w-full">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-foreground font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <span>{item.count}</span>
                <span className="text-xs text-muted font-normal">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EmployeeWorkloadData {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

interface WorkloadBarChartProps {
  data: EmployeeWorkloadData[];
}

export function WorkloadBarChart({ data }: WorkloadBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl bg-surface border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Employee Task Distribution</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent" />
            <span className="text-muted">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span className="text-muted">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#d97706" }} />
            <span className="text-muted">Pending</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {data.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No employee workload data available.</p>
        ) : (
          data.map((item, idx) => {
            const completedPct = (item.completed / maxVal) * 100;
            const inProgressPct = (item.inProgress / maxVal) * 100;
            const pendingPct = (item.pending / maxVal) * 100;

            return (
              <div key={idx} className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between items-center text-foreground font-medium">
                  <span className="truncate max-w-[150px]">{item.name}</span>
                  <span className="text-muted text-xs">
                    {item.completed} / {item.total} Done
                  </span>
                </div>
                <div className="h-2.5 w-full bg-hover rounded-full flex overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all duration-200"
                    style={{ width: `${completedPct}%` }}
                    title={`Completed: ${item.completed}`}
                  />
                  <div
                    className="bg-primary h-full transition-all duration-200"
                    style={{ width: `${inProgressPct}%` }}
                    title={`In Progress: ${item.inProgress}`}
                  />
                  <div
                    className="h-full transition-all duration-200"
                    style={{ width: `${pendingPct}%`, backgroundColor: "#d97706" }}
                    title={`Pending: ${item.pending}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ProgressCardProps {
  title: string;
  value: number | string;
  percentage?: number;
  subtitle?: string;
  color?: string;
}

export function ProgressCard({
  title,
  value,
  percentage,
  subtitle,
  color = "indigo",
}: ProgressCardProps) {
  const strokeColor =
    color === "emerald"
      ? "#059669"
      : color === "blue"
        ? "#2563eb"
        : color === "amber"
          ? "#d97706"
          : color === "rose"
            ? "#dc2626"
            : "#1e3a5f";

  return (
    <div className="p-5 rounded-xl bg-surface border border-border flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-bold text-foreground mt-1">{value}</span>
        {subtitle && <span className="text-xs text-muted mt-1">{subtitle}</span>}
      </div>

      {percentage !== undefined && (
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-border"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              strokeWidth="3.5"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
              stroke={strokeColor}
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              className="transition-all duration-200 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-foreground">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
