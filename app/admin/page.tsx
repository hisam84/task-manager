"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, PriorityBadge, StatCard, StatusBadge } from "@/components/ui";

interface Stats {
  totalEmployees: number;
  totalDepartments: number;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  upcomingDeadlines: { id: string; title: string; dueDate: string; priority: string; status: string }[];
  recentTasks: { id: string; title: string; status: string; priority: string; assignee?: { name: string } }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Company Dashboard</h1>
        <p className="text-sm text-[#888888]">Monitor employees, departments, and assigned work</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={stats?.totalEmployees ?? 0} />
        <StatCard label="Departments" value={stats?.totalDepartments ?? 0} />
        <StatCard label="Total Tasks" value={stats?.total ?? 0} />
        <StatCard label="Completion Rate" value={`${stats?.completionRate ?? 0}%`} />
        <StatCard label="Pending" value={stats?.pending ?? 0} />
        <StatCard label="In Progress" value={stats?.inProgress ?? 0} />
        <StatCard label="Completed" value={stats?.completed ?? 0} />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-medium">Tasks by status</h2>
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
          <div className="space-y-3">
            {(stats?.upcomingDeadlines ?? []).map((task) => (
              <Link key={task.id} href={`/admin/tasks/${task.id}`} className="block rounded-lg border border-[#1f1f1f] p-3 hover:border-[#333333]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white">{task.title}</p>
                  <PriorityBadge priority={task.priority} />
                </div>
                <p className="mt-1 text-[11px] text-[#888888]">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                </p>
              </Link>
            ))}
            {(stats?.upcomingDeadlines ?? []).length === 0 ? (
              <p className="text-xs text-[#666666]">No upcoming deadlines</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
        <h2 className="mb-4 text-sm font-medium">Recent tasks</h2>
        <div className="space-y-2">
          {(stats?.recentTasks ?? []).map((task) => (
            <Link key={task.id} href={`/admin/tasks/${task.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[#111111]">
              <div>
                <p className="text-sm">{task.title}</p>
                <p className="text-[11px] text-[#666666]">{task.assignee?.name}</p>
              </div>
              <StatusBadge status={task.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
