"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ApplyLeaveModal } from "@/components/apply-leave-modal";
import { LeaveRequestsModal } from "@/components/leave-requests-modal";
import { AuthLoginScreen } from "@/components/auth-login-screen";
import { Footer } from "@/components/footer";
import { ProgressCard, DonutChart, WorkloadBarChart } from "@/components/charts";
import {
  Search,
  Plus,
  Building2,
  LayoutDashboard,
  Loader2,
  Filter,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Coffee,
  Check,
  X as XIcon,
  Calendar,
  ArrowUpRight,
  AlertCircle,
  CalendarDays,
  Bell,
  Ban,
} from "lucide-react";
import { fetchTaskList } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignee?: { name?: string; avatar?: string | null };
  assignees?: { user?: { name?: string; avatar?: string | null } }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [actioningLeaveId, setActioningLeaveId] = useState<string | null>(null);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isLeaveRequestsModalOpen, setIsLeaveRequestsModalOpen] = useState(false);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTasks = useCallback(
    async (cursor?: string | null) => {
      const params = {
        status: statusFilter === "ALL" ? undefined : statusFilter,
        priority: priorityFilter === "ALL" ? undefined : priorityFilter,
        q: debouncedSearch || undefined,
        cursor: cursor || undefined,
        take: "50",
      };
      const data = await fetchTaskList(params);
      return data;
    },
    [statusFilter, priorityFilter, debouncedSearch]
  );

  const fetchLeaves = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch("/api/leaves");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeaveRequests(data);
        }
      }
    } catch (e) {
      console.error("Failed to load leaves for dashboard:", e);
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  const handleQuickLeaveAction = async (leaveId: string, action: "APPROVED" | "REJECTED" | "CANCELLED") => {
    let customNote = "";
    if (action === "CANCELLED") {
      const promptRes = window.prompt("Reason for cancellation (optional):", "");
      if (promptRes === null) return;
      customNote = promptRes.trim();
    } else if (action === "REJECTED") {
      const promptRes = window.prompt("Reason for rejection / note (optional):", "");
      if (promptRes === null) return;
      customNote = promptRes.trim();
    } else if (action === "APPROVED") {
      const promptRes = window.prompt("Approval note (optional, click OK to proceed):", "Approved");
      if (promptRes === null) return;
      customNote = promptRes.trim();
    }

    setActioningLeaveId(leaveId);
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          reviewNotes: customNote || (action === "CANCELLED" ? "Cancelled by applicant" : "Approved from Dashboard"),
        }),
      });
      if (res.ok) {
        setLeaveRequests((prev) => prev.filter((l) => l.id !== leaveId));
        await fetchLeaves();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update leave request.");
      }
    } catch (err) {
      console.error("Leave quick action error:", err);
    } finally {
      setActioningLeaveId(null);
    }
  };

  const fetchSessionAndTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [authRes, repRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/reports"),
      ]);

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (!authData.user) {
        setTasks([]);
        setLeaveRequests([]);
        setNextCursor(null);
        return;
      }

      const repData = await repRes.json();
      if (repData && !repData.error) {
        setReportData(repData);
      }

      await Promise.all([
        (async () => {
          const data = await loadTasks();
          setTasks(data.tasks as TaskRow[]);
          setNextCursor(data.nextCursor);
        })(),
        fetchLeaves(),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loadTasks, fetchLeaves]);

  useEffect(() => {
    fetchSessionAndTasks();
  }, [fetchSessionAndTasks]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await loadTasks(nextCursor);
      setTasks((prev) => [...prev, ...(data.tasks as TaskRow[])]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleQuickStatusChange(taskId: string, newStatus: string) {
    try {
      let cancelReason: string | undefined = undefined;
      if (newStatus === "CANCELLED") {
        const reason = window.prompt("Reason for cancellation (optional):", "");
        if (reason === null) return; // User pressed Cancel on prompt
        cancelReason = reason.trim() || "Marked as cancelled";
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(cancelReason ? { cancelReason, notifyOnCancel: true } : {}),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
        fetchSessionAndTasks();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  if (!loading && !currentUser) {
    return <AuthLoginScreen onSuccess={fetchSessionAndTasks} />;
  }

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (currentUser.role === "SUPER_ADMIN") {
    router.replace("/super-admin");
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const isSuperAdmin = false;
  const isCompanyAdmin = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
  const isEmployee = currentUser.role === "EMPLOYEE";

  const metrics = reportData?.metrics || {};
  const statusBreakdown = reportData?.statusBreakdown || {
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
    CANCELLED: tasks.filter((t) => t.status === "CANCELLED").length,
  };

  const donutItems = [
    { label: "Completed", count: statusBreakdown.DONE || 0, color: "#10b981" },
    { label: "In Progress", count: statusBreakdown.IN_PROGRESS || 0, color: "#3b82f6" },
    { label: "In Review", count: statusBreakdown.IN_REVIEW || 0, color: "#8b5cf6" },
    { label: "To Do", count: statusBreakdown.TODO || 0, color: "#f59e0b" },
    ...(statusBreakdown.CANCELLED ? [{ label: "Cancelled", count: statusBreakdown.CANCELLED, color: "#f43f5e" }] : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={currentUser}
        onUserUpdated={(u) => setCurrentUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
        <div className="p-3.5 sm:p-5 md:p-6 lg:p-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">
                  {isSuperAdmin
                    ? "Platform Global Dashboard"
                    : isCompanyAdmin
                    ? `${currentUser.companyName || "Company"} Admin Dashboard`
                    : "My Task Progression Workspace"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                <span>Welcome back, <strong className="text-slate-900 dark:text-white font-semibold">{currentUser.name}</strong>!</span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span>Role:{" "}</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">{currentUser.role}</span>
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto shrink-0">
              {isSuperAdmin && (
                <button
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Create Company</span>
                </button>
              )}

              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{isEmployee ? "Create Self Task" : "Create Task"}</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
            <ProgressCard
              title="Task Completion Rate"
              value={`${metrics.overallCompletionRate || metrics.completionRate || 0}%`}
              percentage={metrics.overallCompletionRate || metrics.completionRate || 0}
              subtitle="Completion Progress"
              color="emerald"
            />
            <ProgressCard
              title={isSuperAdmin ? "Total Platform Companies" : isCompanyAdmin ? "Total Employees" : "My Assigned Tasks"}
              value={isSuperAdmin ? metrics.totalCompanies || 0 : isCompanyAdmin ? metrics.totalEmployees || 0 : metrics.totalAssigned || tasks.length}
              subtitle={isSuperAdmin ? "Tenant Workspaces" : isCompanyAdmin ? "Company Team" : "Active & Completed"}
              color="indigo"
            />
            <ProgressCard
              title="Completed Tasks"
              value={statusBreakdown.DONE || 0}
              subtitle="Done Workflow"
              color="blue"
            />
            <ProgressCard
              title="In Progress / Pending"
              value={(statusBreakdown.IN_PROGRESS || 0) + (statusBreakdown.TODO || 0)}
              subtitle="Active Tasks"
              color="amber"
            />
          </div>

          {/* Donut Chart & Filter Controls */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6 items-start">
            <div className="xl:col-span-1 space-y-3 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Status Distribution</h3>
              <DonutChart items={donutItems} totalLabel="Tasks" />
            </div>

            <div className="xl:col-span-2 space-y-3.5 sm:space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search task title..."
                    className="w-full min-h-10 sm:min-h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="min-h-10 sm:min-h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="min-h-10 sm:min-h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              {/* Tasks Table (Desktop) & Accordion Cards (Mobile) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-none overflow-hidden">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No tasks found matching your filters.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View (hidden on mobile, visible on md and up) */}
                    <div className="hidden md:block overflow-x-auto table-scroll">
                      <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-3 min-w-[140px]">Task Title</th>
                            <th className="py-2.5 px-2.5 min-w-[125px] whitespace-nowrap">Status Progression</th>
                            <th className="py-2.5 px-2.5 min-w-[85px] whitespace-nowrap">Priority</th>
                            <th className="py-2.5 px-2.5 min-w-[115px] whitespace-nowrap">Deadline</th>
                            <th className="py-2.5 px-2.5 min-w-[110px] whitespace-nowrap">Assignee</th>
                            <th className="py-2.5 px-3 min-w-[85px] text-right whitespace-nowrap">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                          {tasks.map((t) => {
                            const isDone = t.status === "DONE";
                            return (
                              <tr
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className={`transition-all cursor-pointer group ${
                                  isDone
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/25 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/45 border-l-4 border-l-emerald-500 opacity-90 hover:opacity-100"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                }`}
                              >
                                <td
                                  className={`py-2.5 px-3 font-semibold transition-colors ${
                                    isDone
                                      ? "text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200"
                                      : "text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                  }`}
                                >
                                  <div className="font-medium line-clamp-1" title={t.title}>
                                    {t.title}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                  <select
                                    value={t.status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleQuickStatusChange(t.id, e.target.value);
                                    }}
                                    className={`border rounded-lg px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer transition-colors ${
                                      isDone
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-300 hover:border-emerald-400"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500"
                                    }`}
                                  >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="IN_REVIEW">In Review</option>
                                    <option value="DONE">Completed</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      t.priority === "URGENT"
                                        ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                        : t.priority === "HIGH"
                                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                        : t.priority === "MEDIUM"
                                        ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                        : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                  {t.dueDate ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-300 font-mono bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-500/20">
                                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>
                                        {new Date(t.dueDate).toLocaleString([], {
                                          month: "short",
                                          day: "numeric",
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-800 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {(() => {
                                    const all =
                                      t.assignees && t.assignees.length > 0
                                        ? t.assignees.map((a) => a.user).filter(Boolean)
                                        : t.assignee
                                        ? [t.assignee]
                                        : [];
                                    if (all.length === 0) {
                                      return <span className="text-[11px] text-slate-400">Unassigned</span>;
                                    }
                                    if (all.length === 1) {
                                      return (
                                        <div className="flex items-center gap-1.5 max-w-[130px]">
                                          {all[0]?.avatar && (
                                            <img
                                              src={all[0].avatar}
                                              alt={all[0].name || "Assignee"}
                                              className="w-4 h-4 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                                            />
                                          )}
                                          <span className="truncate text-[11px]">{all[0]?.name}</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        className="flex items-center gap-1 max-w-[140px]"
                                        title={all.map((a) => a?.name).filter(Boolean).join(", ")}
                                      >
                                        <span className="truncate text-[11px]">{all[0]?.name}</span>
                                        <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-1 rounded">
                                          +{all.length - 1}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTask(t);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-transparent transition-colors cursor-pointer"
                                  >
                                    View / Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Accordion Card View (visible on mobile, hidden on md and up) */}
                    <div className="md:hidden divide-y divide-slate-200/80 dark:divide-slate-800/80">
                      {tasks.map((t) => {
                        const isExpanded = expandedTaskId === t.id;
                        const isDone = t.status === "DONE";
                        const isCancelled = t.status === "CANCELLED";
                        const isOverdue =
                          t.dueDate &&
                          !isDone &&
                          !isCancelled &&
                          new Date(t.dueDate).getTime() < Date.now();

                        return (
                          <div
                            key={t.id}
                            className={`p-3.5 transition-all ${
                              isDone
                                ? "bg-emerald-50/60 dark:bg-emerald-950/25 border-l-4 border-l-emerald-500 opacity-90 hover:opacity-100"
                                : isCancelled
                                ? "bg-rose-50/60 dark:bg-rose-950/20 border-l-4 border-l-rose-500/70 opacity-80 hover:opacity-100"
                                : "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20"
                            }`}
                          >
                            {/* Tap header to toggle dropdown */}
                            <div
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="cursor-pointer select-none"
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <h4
                                  className={`text-sm font-semibold leading-snug break-words flex-1 transition-colors ${
                                    isDone
                                      ? "text-emerald-700 dark:text-emerald-300 line-through"
                                      : isCancelled
                                      ? "text-slate-400 dark:text-slate-400 line-through"
                                      : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  {t.title}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      t.priority === "URGENT"
                                        ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                        : t.priority === "HIGH"
                                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                        : t.priority === "MEDIUM"
                                        ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                        : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
                                  <div className="p-1 text-slate-400">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Short Details Preview */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    t.status === "DONE"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                                      : t.status === "IN_PROGRESS"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
                                      : t.status === "IN_REVIEW"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                                      : t.status === "CANCELLED"
                                      ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {t.status === "DONE"
                                    ? "Completed"
                                    : t.status === "IN_PROGRESS"
                                    ? "In Progress"
                                    : t.status === "IN_REVIEW"
                                    ? "In Review"
                                    : t.status === "CANCELLED"
                                    ? "Cancelled"
                                    : "To Do"}
                                </span>

                                {t.dueDate && (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                      isOverdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-amber-800 dark:text-amber-300/90"
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {new Date(t.dueDate).toLocaleString([], {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </span>
                                )}

                                {t.assignee?.name && (
                                  <span className="text-slate-600 dark:text-slate-400 text-[10px] truncate max-w-[130px]">
                                    👤 {t.assignee.name}
                                  </span>
                                )}
                              </div>

                              {!isExpanded && t.description && (
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                                  {t.description}
                                </p>
                              )}
                            </div>

                            {/* Dropdown Full Details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-3 animate-fadeIn">
                                {t.description && (
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                                      Description
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                      {t.description}
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Status</span>
                                    <select
                                      value={t.status}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                                      className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                                    >
                                      <option value="TODO">To Do</option>
                                      <option value="IN_PROGRESS">In Progress</option>
                                      <option value="IN_REVIEW">In Review</option>
                                      <option value="DONE">Completed</option>
                                      <option value="CANCELLED">Cancelled</option>
                                    </select>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Assignees</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium block mt-2 truncate text-xs">
                                      {t.assignees && t.assignees.length > 0
                                        ? t.assignees.map((a) => a.user?.name).filter(Boolean).join(", ")
                                        : t.assignee?.name || "Unassigned"}
                                    </span>
                                  </div>

                                  <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500">Deadline (Date & Time):</span>
                                    <span
                                      className={`font-mono text-xs font-medium flex items-center gap-1 ${
                                        isOverdue ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"
                                      }`}
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      {t.dueDate
                                        ? new Date(t.dueDate).toLocaleString([], {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          })
                                        : "Not set"}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTask(t);
                                    }}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span>View Full Details & Edit / Reschedule</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {nextCursor && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMore ? "Loading..." : "Load More Tasks"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Leave Requests Notification Widget on Dashboard (Only PENDING requests shown) */}
          {(() => {
            const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING");

            if (loadingLeaves) {
              return (
                <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Checking leave notifications...</span>
                </div>
              );
            }

            // Case 1: When there are NO pending requests (Like a clean notification bar)
            if (pendingLeaves.length === 0) {
              return (
                <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {isEmployee ? "Leave Notifications" : "Pending Leave Requests"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          0 Pending
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {isEmployee
                          ? "You have no active pending leave requests."
                          : "No pending leave requests. New employee applications will appear here as notifications."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsApplyLeaveOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Apply for Leave</span>
                    </button>
                    <button
                      onClick={() => setIsLeaveRequestsModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>{isEmployee ? "My Leaves" : "View History"}</span>
                    </button>
                    <button
                      onClick={() => router.push("/attendance")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <span>Attendance Sheet</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            // Case 2: When there ARE pending requests waiting for action
            return (
              <div className="rounded-2xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-300/80 dark:border-amber-500/30 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 animate-bounce" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Pending Leave Requests
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                          {pendingLeaves.length} Waiting for Action
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {isEmployee
                          ? "Your pending leave request is waiting for management review."
                          : "New leave requests requiring your review. Actioned requests will automatically clear from this notification list."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsApplyLeaveOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Apply for Leave</span>
                    </button>

                    <button
                      onClick={() => setIsLeaveRequestsModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>{isEmployee ? "My Leaves" : "View History"}</span>
                    </button>

                    <button
                      onClick={() => router.push("/attendance")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <span>Attendance Sheet</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingLeaves.map((leave) => {
                    const isActioning = actioningLeaveId === leave.id;

                    const startFormatted = new Date(leave.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    });
                    const endFormatted = new Date(leave.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    });

                    return (
                      <div
                        key={leave.id}
                        className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-500/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {!isEmployee && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                    {leave.user?.name || "Employee"}
                                  </span>
                                  {leave.user?.department && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      ({leave.user.department})
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                  {startFormatted} - {endFormatted}
                                </span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 animate-pulse">
                              PENDING
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                              {leave.daysCount} Day{leave.daysCount > 1 ? "s" : ""}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-500/20">
                              {leave.leaveType}
                            </span>
                          </div>

                          {leave.reason && (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                              "{leave.reason}"
                            </p>
                          )}
                        </div>

                        {/* Quick decision actions for Admins / Managers or Cancel action for Employee */}
                        {!isEmployee ? (
                          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleQuickLeaveAction(leave.id, "APPROVED")}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleQuickLeaveAction(leave.id, "REJECTED")}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleQuickLeaveAction(leave.id, "CANCELLED")}
                              className="py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Cancel this pending leave request"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Cancel Request</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <Footer />
    </main>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchSessionAndTasks}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={fetchSessionAndTasks}
      />

      <TaskDetailModal
        task={selectedTask}
        currentUser={currentUser}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={fetchSessionAndTasks}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userEmail={currentUser?.email}
      />

      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
        onLeaveApplied={fetchLeaves}
      />

      {currentUser && (
        <LeaveRequestsModal
          isOpen={isLeaveRequestsModalOpen}
          onClose={() => setIsLeaveRequestsModalOpen(false)}
          currentUser={currentUser}
          onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
          onLeaveDecided={fetchLeaves}
        />
      )}
    </div>
  );
}
