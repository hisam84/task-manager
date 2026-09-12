"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Footer } from "@/components/footer";
import {
  ListTodo,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2,
  Calendar,
  Edit3,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetchTaskList } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignee?: { id?: string; name?: string; email?: string; avatar?: string | null; department?: string | null };
  creator?: { id?: string; name?: string; role?: string };
  company?: { id?: string; name?: string };
  _count?: { comments?: number };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  order?: number;
  departmentName?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTasks = useCallback(
    async (cursor?: string | null) => {
      const params: any = {
        status: statusFilter === "ALL" ? undefined : statusFilter,
        priority: priorityFilter === "ALL" ? undefined : priorityFilter,
        assigneeId: assigneeFilter === "ALL" ? undefined : assigneeFilter,
        q: debouncedSearch || undefined,
        cursor: cursor || undefined,
        take: "50",
      };
      const data = await fetchTaskList(params);
      return data;
    },
    [statusFilter, priorityFilter, assigneeFilter, debouncedSearch]
  );

  const fetchSessionAndTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [authRes, userRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
      ]);

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (!authData.user) {
        setTasks([]);
        setNextCursor(null);
        return;
      }

      if (userRes.ok) {
        const uData = await userRes.json();
        if (Array.isArray(uData)) {
          const sorted = [...uData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTeamMembers(sorted);
        }
      }

      const data = await loadTasks();
      setTasks(data.tasks as TaskItem[]);
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
      setTasks((prev) => [...prev, ...(data.tasks as TaskItem[])]);
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
        if (reason === null) return; // User pressed Cancel on the prompt
        cancelReason = reason.trim() || "Marked as cancelled";
      }

      let notifyCreatorOnComplete = false;
      let completionNote: string | undefined = undefined;

      if (newStatus === "DONE") {
        const wantsNotify = window.confirm(
          "টাস্কটি সম্পন্ন হয়েছে। টাস্ক এসাইনকারীকে কি কমপ্লিটেশন ইমেইল পাঠাতে চান? (ঐচ্ছিক)\nWould you like to send a completion email to the task assigner? (Optional)"
        );
        if (wantsNotify) {
          notifyCreatorOnComplete = true;
          const note = window.prompt(
            "কমপ্লিটেশন সংক্রান্ত কোনো মন্তব্য বা নোট দিতে চান? (ঐচ্ছিক / Optional):",
            ""
          );
          if (note && note.trim()) {
            completionNote = note.trim();
          }
        }
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(cancelReason ? { cancelReason, notifyOnCancel: true } : {}),
          ...(notifyCreatorOnComplete ? { notifyCreatorOnComplete: true, completionNote } : {}),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

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

  const isManagerOrAdmin = ["ADMIN", "MANAGER"].includes(currentUser.role);
  const isEmployee = currentUser.role === "EMPLOYEE";

  // Compute status counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const cancelledCount = tasks.filter((t) => t.status === "CANCELLED").length;

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={currentUser}
        onUserUpdated={(u) => setCurrentUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
        <div className="p-4 sm:p-6 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <ListTodo className="w-6 h-6 text-indigo-400" />
                Task List & Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isEmployee
                  ? "Manage your assigned tasks, update progression, reschedule deadlines, and post updates."
                  : "Organize, assign, edit, reschedule, and monitor task progression across your company."}
              </p>
            </div>

            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{isEmployee ? "Create Self Task" : "Create New Task"}</span>
            </button>
          </div>

          {/* Status Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: "ALL", label: "All Tasks", count: totalCount },
              { id: "TODO", label: "To Do", count: todoCount },
              { id: "IN_PROGRESS", label: "In Progress", count: inProgressCount },
              { id: "IN_REVIEW", label: "In Review", count: inReviewCount },
              { id: "DONE", label: "Completed", count: doneCount },
              { id: "CANCELLED", label: "Cancelled", count: cancelledCount },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or description..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-700 transition-colors"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>

              {/* Assignee Filter (for Admin / Manager) */}
              {isManagerOrAdmin && teamMembers.length > 0 && (
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <option value="ALL">All Assignees</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{((m.order ?? 0) + 1)} {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Task List Container */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm overflow-hidden">
            {tasks.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ListTodo className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No tasks found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                    ? "Try adjusting your filters or search terms."
                    : isEmployee
                    ? "You have no active tasks. Click 'Create Self Task' to start a personal task."
                    : "Create a new task to assign work to your team."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View (Hidden on mobile, visible on md and up) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Progression</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Deadline (Date & Time)</th>
                        <th className="py-3 px-4">Assignee</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {tasks.map((t) => {
                        const isDone = t.status === "DONE";
                        const isCancelled = t.status === "CANCELLED";
                        const isOverdue =
                          t.dueDate &&
                          !isDone &&
                          !isCancelled &&
                          new Date(t.dueDate).getTime() < Date.now();

                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className={`transition-all cursor-pointer group ${
                              isDone
                                ? "bg-emerald-950/25 dark:bg-emerald-950/35 hover:bg-emerald-950/45 border-l-4 border-l-emerald-500 opacity-80 hover:opacity-100"
                                : isCancelled
                                ? "bg-rose-950/15 dark:bg-rose-950/25 hover:bg-rose-950/35 border-l-4 border-l-rose-500/70 opacity-75 hover:opacity-100"
                                : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Title & Description */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div
                                className={`font-semibold transition-colors truncate ${
                                  isDone
                                    ? "text-emerald-600 dark:text-emerald-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-200 line-through"
                                    : isCancelled
                                    ? "text-slate-400 dark:text-slate-400 line-through group-hover:text-rose-400"
                                    : "text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                }`}
                              >
                                {t.title}
                              </div>
                              {t.description && (
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {t.description}
                                </div>
                              )}
                            </td>

                            {/* Status Progression Dropdown */}
                            <td className="py-3.5 px-4">
                              <select
                                value={t.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatusChange(t.id, e.target.value);
                                }}
                                className={`border rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none cursor-pointer transition-colors ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-300 hover:border-emerald-400"
                                    : t.status === "CANCELLED"
                                    ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:border-rose-500/40 dark:text-rose-300 hover:border-rose-400"
                                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500"
                                }`}
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="DONE">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            </td>

                            {/* Priority Badge */}
                            <td className="py-3.5 px-4">
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

                            {/* Deadline with Date & Time */}
                            <td className="py-3.5 px-4">
                              {t.dueDate ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                                    isOverdue
                                      ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                      : "bg-amber-500/10 text-amber-300/90 border-amber-500/20"
                                  }`}
                                >
                                  <Clock
                                    className={`w-3 h-3 shrink-0 ${
                                      isOverdue ? "text-rose-400" : "text-amber-400"
                                    }`}
                                  />
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

                            {/* Assignee Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                {t.assignee?.avatar ? (
                                  <img
                                    src={t.assignee.avatar}
                                    alt={t.assignee.name || "Assignee"}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shrink-0">
                                    {t.assignee?.name?.[0]?.toUpperCase() || "U"}
                                  </div>
                                )}
                                <span className="text-slate-300 font-medium truncate max-w-[120px]">
                                  {t.assignee?.name || "Unassigned"}
                                </span>
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTask(t);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-colors shadow-sm"
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

                {/* Mobile Accordion Card View (visible on mobile, hidden on md and up - No Horizontal Scroll) */}
                <div className="md:hidden divide-y divide-slate-800/80">
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
                            ? "bg-emerald-950/25 dark:bg-emerald-950/35 border-l-4 border-l-emerald-500 opacity-80 hover:opacity-100"
                            : isCancelled
                            ? "bg-rose-950/15 dark:bg-rose-950/25 border-l-4 border-l-rose-500/70 opacity-75 hover:opacity-100"
                            : "transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/20"
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
                                  ? "text-emerald-300 line-through"
                                  : isCancelled
                                  ? "text-slate-400 line-through"
                                  : "text-white"
                              }`}
                            >
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
                                  : t.status === "CANCELLED"
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                  : "bg-slate-800 text-slate-400"
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
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3">
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
                                  <option value="CANCELLED">Cancelled</option>
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

          {/* Load More Pagination */}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                <span>Load More Tasks</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchSessionAndTasks}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
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
