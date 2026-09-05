"use client";

import { useEffect, useState } from "react";
import { BarChart, EmptyState, StatCard, inputClass } from "@/components/ui";

interface ReportRow {
  employeeId: string;
  employeeName: string;
  department: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  avgCompletionHours: number | null;
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  } | null>(null);
  const [charts, setCharts] = useState<{
    byStatus: { label: string; value: number }[];
    byEmployee: { label: string; value: number }[];
  } | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (departmentId) params.set("departmentId", departmentId);
    const res = await fetch(`/api/reports?${params.toString()}`);
    const data = await res.json();
    setRows(data.employees ?? []);
    setSummary(data.summary);
    setCharts(data.charts);
  }

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    load();
  }, [departmentId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Employee Reports</h1>
          <p className="text-sm text-[#888888]">Employee-wise task completion and overdue work</p>
        </div>
        <a
          href={`/api/reports?format=csv${departmentId ? `&departmentId=${departmentId}` : ""}`}
          className="rounded-lg border border-[#222222] px-3 py-2 text-xs hover:border-[#333333]"
        >
          Export CSV
        </a>
      </div>
      <select className={`${inputClass} max-w-xs`} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tasks" value={summary?.total ?? 0} />
        <StatCard label="Completed" value={summary?.completed ?? 0} />
        <StatCard label="Overdue" value={summary?.overdue ?? 0} />
        <StatCard label="Completion Rate" value={`${summary?.completionRate ?? 0}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-medium">Tasks by status</h2>
          <BarChart items={charts?.byStatus ?? []} />
        </div>
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-4 text-sm font-medium">Tasks by employee</h2>
          <BarChart items={(charts?.byEmployee ?? []).slice(0, 8)} />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No report data" description="Add employees and tasks to generate reports." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222222]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0a] text-left text-[11px] uppercase text-[#888888]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">In Progress</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeId} className="border-t border-[#1f1f1f]">
                  <td className="px-4 py-3">{row.employeeName}</td>
                  <td className="px-4 py-3">{row.department}</td>
                  <td className="px-4 py-3">{row.total}</td>
                  <td className="px-4 py-3">{row.pending}</td>
                  <td className="px-4 py-3">{row.inProgress}</td>
                  <td className="px-4 py-3">{row.completed}</td>
                  <td className="px-4 py-3">{row.overdue}</td>
                  <td className="px-4 py-3">{row.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
