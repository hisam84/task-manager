"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, PriorityBadge, StatCard, StatusBadge } from "@/components/ui";

interface DashTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
}

interface EmployeeStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  upcomingDeadlines: DashTask[];
  recentTasks: DashTask[];
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Dashboard</h1>
        <p className="text-sm text-[#888888]">Your assigned work, deadlines, and completion rate</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Tasks" value={stats?.total ?? 0} />
        <StatCard label="Pending" value={stats?.pending ?? 0} />
        <StatCard label="In Progress" value={stats?.inProgress ?? 0} />
        <StatCard label="Completed" value={stats?.completed ?? 0} />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} />
        <StatCard label="Completion Rate" value={`${stats?.completionRate ?? 0}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-medium">Personal task statistics</h2>
          <BarChart
            items={[
              { label: "Pending", value: stats?.pending ?? 0 },
              { label: "In Progress", value: stats?.inProgress ?? 0 },
              { label: "Completed", value: stats?.completed ?? 0 },
              { label: "Overdue", value: stats?.overdue ?? 0 },
            ]}
          />
        </div>
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-medium">Upcoming deadlines</h2>
          {(stats?.upcomingDeadlines ?? []).map((task) => (
            <Link key={task.id} href={`/employee/tasks/${task.id}`} className="mb-2 block rounded-lg border border-[#1f1f1f] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">{task.title}</p>
                <PriorityBadge priority={task.priority} />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
        <h2 className="mb-4 text-sm font-medium">Recent tasks</h2>
        {(stats?.recentTasks ?? []).map((task) => (
          <Link key={task.id} href={`/employee/tasks/${task.id}`} className="flex items-center justify-between py-2">
            <span className="text-sm">{task.title}</span>
            <StatusBadge status={task.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
