"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { DonutChart, WorkloadBarChart, ProgressCard } from "@/components/charts";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { BarChart3, Loader2, CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      const [meRes, repRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/reports"),
      ]);

      const meData = await meRes.json();
      if (meData?.user) setUser(meData.user);

      const repData = await repRes.json();
      if (repData && !repData.error) {
        setReportData(repData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    router.replace("/super-admin");
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const metrics = reportData?.metrics || {};
  const statusBreakdown = reportData?.statusBreakdown || { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  const employeeMatrix = reportData?.employeeMatrix || [];

  const donutItems = [
    { label: "Completed", count: statusBreakdown.DONE, color: "#10b981" },
    { label: "In Progress", count: statusBreakdown.IN_PROGRESS, color: "#3b82f6" },
    { label: "In Review", count: statusBreakdown.IN_REVIEW, color: "#8b5cf6" },
    { label: "To Do", count: statusBreakdown.TODO, color: "#f59e0b" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                Task Performance & Employee Reports
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Visual workload analytics, employee task breakdown, and status reports
              </p>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProgressCard
              title="Overall Completion"
              value={`${metrics.overallCompletionRate || metrics.completionRate || 0}%`}
              percentage={metrics.overallCompletionRate || metrics.completionRate || 0}
              subtitle="Completion Rate"
              color="emerald"
            />
            <ProgressCard
              title="Total Assigned"
              value={metrics.totalTasks || metrics.totalAssigned || 0}
              subtitle="Tasks in Scope"
              color="indigo"
            />
            <ProgressCard
              title="Completed Tasks"
              value={metrics.completedTasks || metrics.completed || 0}
              subtitle="Marked as Done"
              color="blue"
            />
            <ProgressCard
              title="Overdue Tasks"
              value={metrics.overdue || 0}
              subtitle="Missed Deadlines"
              color="rose"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Task Status Breakdown</h3>
              <DonutChart items={donutItems} totalLabel="Tasks" />
            </div>

            {employeeMatrix.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Employee Workload</h3>
                <WorkloadBarChart data={employeeMatrix} />
              </div>
            )}
          </div>

          {/* Employee-Wise Task Report Table */}
          {employeeMatrix.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Employee-Wise Task Breakdown Matrix
              </h3>

              <div className="table-scroll rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                      <th className="p-4">Employee</th>
                      <th className="p-4">Department</th>
                      <th className="p-4 text-center">Total Tasks</th>
                      <th className="p-4 text-center">Completed</th>
                      <th className="p-4 text-center">In Progress</th>
                      <th className="p-4 text-center">Pending</th>
                      <th className="p-4 text-center">Overdue</th>
                      <th className="p-4 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {employeeMatrix.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <div>{emp.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{emp.email}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {emp.department}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-white">{emp.totalTasks}</td>
                        <td className="p-4 text-center text-emerald-400 font-semibold">{emp.completed}</td>
                        <td className="p-4 text-center text-blue-400 font-semibold">{emp.inProgress}</td>
                        <td className="p-4 text-center text-amber-400 font-semibold">{emp.pending}</td>
                        <td className="p-4 text-center text-rose-400 font-semibold">{emp.overdue}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${emp.completionRate}%` }}
                              />
                            </div>
                            <span className="font-bold text-white">{emp.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
