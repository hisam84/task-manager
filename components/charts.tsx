"use client";

import React from "react";

// --- 1. DONUT CHART (Task Status Distribution) ---
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
    <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center justify-center gap-5 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-none w-full min-w-0">
      <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90 transform">
          {slices.map((slice, i) =>
            slice.pathData ? (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              />
            ) : null
          )}
          {total === 0 && (
            <circle cx="0" cy="0" r="1" fill="#94a3b8" className="opacity-30" />
          )}
          {/* Inner cutout for donut effect */}
          <circle cx="0" cy="0" r="0.68" className="donut-inner-cutout" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{total}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{totalLabel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200 shrink-0 text-xs">
                <span>{item.count}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 2. BAR CHART (Employee Workload & Completion Matrix) ---
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
    <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-none min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Employee Task Distribution</h3>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Pending</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {data.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No employee workload data available.</p>
        ) : (
          data.map((item, idx) => {
            const completedPct = (item.completed / maxVal) * 100;
            const inProgressPct = (item.inProgress / maxVal) * 100;
            const pendingPct = (item.pending / maxVal) * 100;

            return (
              <div key={idx} className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium">
                  <span className="truncate max-w-[150px] text-slate-900 dark:text-white">{item.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {item.completed} / {item.total} Done
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                    title={`Completed: ${item.completed}`}
                  />
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${inProgressPct}%` }}
                    title={`In Progress: ${item.inProgress}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${pendingPct}%` }}
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

// --- 3. PROGRESS CARD GAUGE ---
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
      ? "#10b981"
      : color === "blue"
      ? "#3b82f6"
      : color === "amber"
      ? "#f59e0b"
      : color === "rose"
      ? "#f43f5e"
      : color === "purple"
      ? "#a855f7"
      : "#6366f1";

  const cleanPercentage =
    percentage !== undefined ? Math.min(Math.max(Math.round(percentage), 0), 100) : undefined;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-none flex items-center justify-between gap-3 min-w-0">
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={title}>
          {title}
        </span>
        <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
          {value}
        </span>
        {subtitle && (
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {subtitle}
          </span>
        )}
      </div>

      {cleanPercentage !== undefined && (
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="3.2"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeWidth="3.2"
              strokeDasharray={`${cleanPercentage}, 100`}
              strokeLinecap="round"
              stroke={strokeColor}
              fill="none"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
            {cleanPercentage}%
          </span>
        </div>
      )}
    </div>
  );
}
