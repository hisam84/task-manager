"use client";

import { useEffect, useState } from "react";
import { BarChart, StatCard } from "@/components/ui";

interface EmployeeReport {
  summary: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    inProgress: number;
    completionRate: number;
  };
  activity: { month: string; created: number }[];
}

export default function EmployeeReportsPage() {
  const [data, setData] = useState<EmployeeReport | null>(null);

  useEffect(() => {
    fetch("/api/reports").then((r) => r.json()).then(setData);
  }, []);

  const summary = data?.summary;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">My Reports</h1>
        <p className="text-sm text-[#888888]">Personal completion and activity over time</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tasks" value={summary?.total ?? 0} />
        <StatCard label="Completed" value={summary?.completed ?? 0} />
        <StatCard label="Pending" value={summary?.pending ?? 0} />
        <StatCard label="Overdue" value={summary?.overdue ?? 0} />
        <StatCard label="In Progress" value={summary?.inProgress ?? 0} />
        <StatCard label="Completion Rate" value={`${summary?.completionRate ?? 0}%`} />
      </div>
      <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
        <h2 className="mb-4 text-sm font-medium">Task activity over time</h2>
        <BarChart
          items={(data?.activity ?? []).map((row) => ({
            label: row.month,
            value: row.created,
          }))}
        />
      </div>
    </div>
  );
}
