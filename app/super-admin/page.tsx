"use client";

import { useEffect, useState } from "react";
import { BarChart, StatCard } from "@/components/ui";

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalEmployees: number;
  totalDepartments: number;
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Super Admin Dashboard</h1>
        <p className="text-sm text-[#888888]">System-wide companies, people, and tasks</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Companies" value={stats?.totalCompanies ?? 0} />
        <StatCard label="Active Companies" value={stats?.activeCompanies ?? 0} />
        <StatCard label="Total Employees" value={stats?.totalEmployees ?? 0} />
        <StatCard label="Total Departments" value={stats?.totalDepartments ?? 0} />
        <StatCard label="Total Tasks" value={stats?.total ?? 0} />
        <StatCard label="Pending Tasks" value={stats?.pending ?? 0} />
        <StatCard label="Completed Tasks" value={stats?.completed ?? 0} />
        <StatCard label="Overdue Tasks" value={stats?.overdue ?? 0} hint="Past deadline and not completed" />
      </div>
      <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
        <h2 className="mb-4 text-sm font-medium">Task overview</h2>
        <BarChart
          items={[
            { label: "Pending", value: stats?.pending ?? 0 },
            { label: "Completed", value: stats?.completed ?? 0 },
            { label: "Overdue", value: stats?.overdue ?? 0 },
          ]}
        />
      </div>
    </div>
  );
}
