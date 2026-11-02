"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { DonutChart, WorkloadBarChart, ProgressCard } from "@/components/charts";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Footer } from "@/components/footer";
import { BarChart3, Loader2, CheckCircle2, Clock, AlertTriangle, Users, Printer } from "lucide-react";
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
  const statusBreakdown = reportData?.statusBreakdown || { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, CANCELLED: 0 };
  const employeeMatrix = reportData?.employeeMatrix || [];

  const donutItems = [
    { label: "Completed", count: statusBreakdown.DONE, color: "#10b981" },
    { label: "In Progress", count: statusBreakdown.IN_PROGRESS, color: "#3b82f6" },
    { label: "In Review", count: statusBreakdown.IN_REVIEW, color: "#8b5cf6" },
    { label: "To Do", count: statusBreakdown.TODO, color: "#f59e0b" },
    ...(statusBreakdown.CANCELLED ? [{ label: "Cancelled", count: statusBreakdown.CANCELLED, color: "#f43f5e" }] : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 landscape;
              margin: 10mm 10mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-size: 16px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              aside, nav, footer, .print-hidden, button {
                display: none !important;
              }
              main {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #0f172a !important;
              }
              .table-scroll {
                overflow: visible !important;
                border: 1px solid #cbd5e1 !important;
                background: #ffffff !important;
              }
              table {
                width: 100% !important;
                font-size: 16px !important;
                border-collapse: collapse !important;
              }
              thead {
                display: table-header-group !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              th, td {
                font-size: 16px !important;
                color: #0f172a !important;
                border: 1px solid #cbd5e1 !important;
                padding: 8px 10px !important;
              }
              th {
                background-color: #f1f5f9 !important;
                font-weight: 700 !important;
              }
            }
          `,
        }}
      />

      <Sidebar
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
        <div className="p-4 sm:p-6 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:pb-3 print:border-slate-300">
              <div>
                <h1 className="text-2xl font-bold text-white print:text-slate-900 tracking-tight flex items-center gap-2.5">
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                  Task Performance & Employee Reports
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  Visual workload analytics, employee task breakdown, and status reports
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto print:hidden"
              >
                <Printer className="w-4 h-4" />
                Print Report
              </button>
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
                <h3 className="text-sm font-semibold text-white print:text-slate-900 mb-3">Task Status Breakdown</h3>
                <DonutChart items={donutItems} totalLabel="Tasks" />
              </div>

              {employeeMatrix.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white print:text-slate-900 mb-3">Employee Workload</h3>
                  <WorkloadBarChart data={employeeMatrix} />
                </div>
              )}
            </div>

            {/* Employee-Wise Task Report Table */}
            {employeeMatrix.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-semibold text-white print:text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Employee-Wise Task Breakdown Matrix
                </h3>

                <div className="table-scroll rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <table className="w-full text-left text-xs print:text-base border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-400 print:text-slate-900 font-semibold text-xs print:text-base">
                        <th className="p-4 print:p-2.5 min-w-[200px] w-[22%]">Employee</th>
                        <th className="p-4 print:p-2.5 min-w-[120px] w-[14%]">Department</th>
                        <th className="p-4 print:p-2.5 text-center min-w-[90px] w-[10%]">Total Tasks</th>
                        <th className="p-4 print:p-2.5 text-center min-w-[90px] w-[10%]">Completed</th>
                        <th className="p-4 print:p-2.5 text-center min-w-[90px] w-[10%]">In Progress</th>
                        <th className="p-4 print:p-2.5 text-center min-w-[90px] w-[10%]">Pending</th>
                        <th className="p-4 print:p-2.5 text-center min-w-[90px] w-[10%]">Overdue</th>
                        <th className="p-4 print:p-2.5 text-right min-w-[120px] w-[14%]">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-slate-300 text-slate-300 print:text-slate-900 text-xs print:text-base">
                      {employeeMatrix.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 print:hover:bg-transparent transition-colors">
                          <td className="p-4 print:p-2.5 font-semibold text-slate-900 dark:text-white print:text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-700 dark:text-slate-300 print:text-slate-800 font-mono text-[10px] print:text-sm font-bold border border-slate-200 dark:border-slate-700 print:border-slate-300">
                                #{(emp.order !== undefined ? emp.order : 0) + 1}
                              </span>
                              <span className="print:text-base">{emp.name}</span>
                            </div>
                            <div className="text-[11px] print:text-sm text-slate-400 print:text-slate-600 font-normal">{emp.email}</div>
                          </td>
                          <td className="p-4 print:p-2.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 print:bg-slate-100 border border-slate-200 dark:border-slate-800 print:border-slate-300 text-slate-700 dark:text-slate-300 print:text-slate-800 text-[11px] print:text-base font-medium">
                              {emp.department || "General"}
                            </span>
                          </td>
                          <td className="p-4 print:p-2.5 text-center font-bold text-slate-900 dark:text-white print:text-slate-900 print:text-base">{emp.totalTasks}</td>
                          <td className="p-4 print:p-2.5 text-center text-emerald-400 print:text-emerald-700 font-semibold print:text-base">{emp.completed}</td>
                          <td className="p-4 print:p-2.5 text-center text-blue-400 print:text-blue-700 font-semibold print:text-base">{emp.inProgress}</td>
                          <td className="p-4 print:p-2.5 text-center text-amber-400 print:text-amber-700 font-semibold print:text-base">{emp.pending}</td>
                          <td className="p-4 print:p-2.5 text-center text-rose-400 print:text-rose-700 font-semibold print:text-base">{emp.overdue}</td>
                          <td className="p-4 print:p-2.5 text-right print:text-base">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-800 print:bg-slate-300 h-2 rounded-full overflow-hidden print:hidden">
                                <div
                                  className="bg-emerald-500 h-full"
                                  style={{ width: `${emp.completionRate}%` }}
                                />
                              </div>
                              <span className="font-bold text-white print:text-slate-900 print:text-base">{emp.completionRate}%</span>
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
        </div>

        <Footer />
      </main>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
