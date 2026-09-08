"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { AuthLoginScreen } from "@/components/auth-login-screen";
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
        setNextCursor(null);
        return;
      }

      const repData = await repRes.json();
      if (repData && !repData.error) {
        setReportData(repData);
      }

      const data = await loadTasks();
      setTasks(data.tasks as TaskRow[]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loadTasks]);

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
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
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
    return (
      <div className="min-h-dvh flex flex-col bg-slate-950 text-white font-sans">
        <AuthLoginScreen onSuccess={fetchSessionAndTasks} />
      </div>
    );
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
  };

  const donutItems = [
    { label: "Completed", count: statusBreakdown.DONE || 0, color: "#10b981" },
    { label: "In Progress", count: statusBreakdown.IN_PROGRESS || 0, color: "#3b82f6" },
    { label: "In Review", count: statusBreakdown.IN_REVIEW || 0, color: "#8b5cf6" },
    { label: "To Do", count: statusBreakdown.TODO || 0, color: "#f59e0b" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={currentUser}
        onUserUpdated={(u) => setCurrentUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <LayoutDashboard className="w-6 h-6 text-indigo-400" />
                {isSuperAdmin
                  ? "Platform Global Dashboard"
                  : isCompanyAdmin
                  ? `${currentUser.companyName || "Company"} Admin Dashboard`
                  : "My Task Progression Workspace"}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Welcome back, <span className="text-white font-medium">{currentUser.name}</span>! Role:{" "}
                <span className="text-indigo-400 font-semibold">{currentUser.role}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {isSuperAdmin && (
                <button
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/25 w-full sm:w-auto"
                >
                  <Building2 className="w-4 h-4" />
                  Create Company
                </button>
              )}

              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-600/25 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                {isEmployee ? "Create Self Task" : "Create Task"}
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-white mb-3">Status Distribution</h3>
              <DonutChart items={donutItems} totalLabel="Tasks" />
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search task title..."
                    className="w-full min-h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3 py-2.5 text-base md:text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="min-h-11 flex-1 bg-slate-950 border border-slate-800 text-base md:text-xs font-mono text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="min-h-11 flex-1 bg-slate-950 border border-slate-800 text-base md:text-xs font-mono text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
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
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No tasks found matching your filters.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View (hidden on mobile, visible on md and up) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                            <th className="py-3 px-4">Task Title</th>
                            <th className="py-3 px-4">Status Progression</th>
                            <th className="py-3 px-4">Priority</th>
                            <th className="py-3 px-4">Deadline</th>
                            <th className="py-3 px-4">Assignee</th>
                            <th className="py-3 px-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {tasks.map((t) => (
                            <tr
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                {t.title}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={t.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatusChange(t.id, e.target.value);
                                  }}
                                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-200 outline-none cursor-pointer hover:border-indigo-500 transition-colors"
                                >
                                  <option value="TODO">To Do</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="IN_REVIEW">In Review</option>
                                  <option value="DONE">Completed</option>
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                    t.priority === "URGENT"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : t.priority === "HIGH"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : t.priority === "MEDIUM"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                  }`}
                                >
                                  {t.priority}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {t.dueDate ? (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300/90 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
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
                                  <span className="text-slate-500 text-[11px] font-mono">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-300 font-medium">
                                <div className="flex items-center gap-2">
                                  {t.assignee?.avatar ? (
                                    <img
                                      src={t.assignee.avatar}
                                      alt={t.assignee.name || "Assignee"}
                                      className="w-5 h-5 rounded-full object-cover border border-slate-700 shrink-0"
                                    />
                                  ) : null}
                                  <span>{t.assignee?.name || "Unassigned"}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(t);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors"
                                >
                                  View / Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Accordion Card View (visible on mobile, hidden on md and up) */}
                    <div className="md:hidden divide-y divide-slate-800/80">
                      {tasks.map((t) => {
                        const isExpanded = expandedTaskId === t.id;
                        const isOverdue =
                          t.dueDate &&
                          t.status !== "DONE" &&
                          new Date(t.dueDate).getTime() < Date.now();

                        return (
                          <div key={t.id} className="p-3.5 transition-colors hover:bg-slate-800/20">
                            {/* Tap header to toggle dropdown */}
                            <div
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="cursor-pointer select-none"
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <h4 className="text-sm font-semibold text-white leading-snug break-words flex-1">
                                  {t.title}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      t.priority === "URGENT"
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        : t.priority === "HIGH"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : t.priority === "MEDIUM"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
                                  <div className="p-1 text-slate-400">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-indigo-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Short Details Preview */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    t.status === "DONE"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : t.status === "IN_PROGRESS"
                                      ? "bg-blue-500/15 text-blue-400"
                                      : t.status === "IN_REVIEW"
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {t.status === "DONE"
                                    ? "Completed"
                                    : t.status === "IN_PROGRESS"
                                    ? "In Progress"
                                    : t.status === "IN_REVIEW"
                                    ? "In Review"
                                    : "To Do"}
                                </span>

                                {t.dueDate && (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                      isOverdue ? "text-rose-400 font-medium" : "text-amber-300/90"
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
                                  <span className="text-slate-400 text-[10px] truncate max-w-[130px]">
                                    👤 {t.assignee.name}
                                  </span>
                                )}
                              </div>

                              {!isExpanded && t.description && (
                                <p className="mt-1.5 text-xs text-slate-400 line-clamp-1 leading-relaxed">
                                  {t.description}
                                </p>
                              )}
                            </div>

                            {/* Dropdown Full Details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-fadeIn">
                                {t.description && (
                                  <div>
                                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                                      Description
                                    </span>
                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                      {t.description}
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Status</span>
                                    <select
                                      value={t.status}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                                      className="mt-1 w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                                    >
                                      <option value="TODO">To Do</option>
                                      <option value="IN_PROGRESS">In Progress</option>
                                      <option value="IN_REVIEW">In Review</option>
                                      <option value="DONE">Completed</option>
                                    </select>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Assignee</span>
                                    <span className="text-slate-200 font-medium block mt-2 truncate">
                                      {t.assignee?.name || "Unassigned"}
                                    </span>
                                  </div>

                                  <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500">Deadline (Date & Time):</span>
                                    <span
                                      className={`font-mono text-xs font-medium flex items-center gap-1 ${
                                        isOverdue ? "text-rose-400" : "text-amber-300"
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
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
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
                    className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More Tasks"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
      />
    </div>
  );
}
