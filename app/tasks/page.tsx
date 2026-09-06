"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
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
  assignee?: { id?: string; name?: string; email?: string; department?: string | null };
  creator?: { id?: string; name?: string; role?: string };
  company?: { id?: string; name?: string };
  _count?: { comments?: number };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentName?: string;
}

export default function TasksPage() {
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
        if (Array.isArray(uData)) setTeamMembers(uData);
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
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
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

  const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser.role);
  const isEmployee = currentUser.role === "EMPLOYEE";

  // Compute status counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={currentUser}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
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
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Task List Table */}
          <div className="overflow-x-auto rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
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
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                    <th className="py-3 px-4">Task Details</th>
                    <th className="py-3 px-4">Progression</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Deadline (তারিখ ও সময়)</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {tasks.map((t) => {
                    const isOverdue =
                      t.dueDate &&
                      t.status !== "DONE" &&
                      new Date(t.dueDate).getTime() < Date.now();

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
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
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-200 outline-none cursor-pointer hover:border-indigo-500 transition-colors"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="DONE">Completed</option>
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
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700">
                              {t.assignee?.name?.[0]?.toUpperCase() || "U"}
                            </div>
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
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors shadow-sm"
                          >
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Load More Pagination */}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                <span>Load More Tasks</span>
              </button>
            </div>
          )}
        </div>
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
