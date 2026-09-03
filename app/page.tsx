"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { Search, Plus, Building2 } from "lucide-react";
import { AuthLoginScreen } from "@/components/auth-login-screen";
import { fetchTaskList } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { name?: string };
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

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
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (!authData.user) {
        setTasks([]);
        setNextCursor(null);
        return;
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
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!loading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navbar user={null} />
        <AuthLoginScreen onSuccess={fetchSessionAndTasks} />
      </div>
    );
  }

  const canCreateCompany = currentUser?.role === "SUPER_ADMIN";
  const canCreateTask = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUser?.role ?? "");

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar
        user={currentUser}
        onOpenCreateTask={canCreateTask ? () => setIsCreateTaskOpen(true) : undefined}
        onOpenCreateCompany={canCreateCompany ? () => setIsCreateCompanyOpen(true) : undefined}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1f1f1f] pb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Tasks Overview</h1>
            <p className="text-xs text-[#888888] font-mono mt-0.5">
              {currentUser?.companyName || "Platform Wide"} ({tasks.length}
              {nextCursor ? "+" : ""} tasks)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCreateCompany && (
              <button
                onClick={() => setIsCreateCompanyOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#7928ca]/20 text-purple-300 hover:bg-[#7928ca]/30 border border-[#7928ca]/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Create Company</span>
              </button>
            )}

            {canCreateTask && (
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-[#1f1f1f]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#555555] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#111111] border border-[#222222] text-xs font-mono text-[#eaeaea] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
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
              className="bg-[#111111] border border-[#222222] text-xs font-mono text-[#eaeaea] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <div className="vercel-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs font-mono text-[#888888]">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-10 text-center text-xs font-mono text-[#666666]">No tasks found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1f1f1f] bg-[#050505] text-[#666666] font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Assignee</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181818]">
                  {tasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="hover:bg-[#111111] transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white group-hover:text-[#0070f3] transition-colors">
                          {t.title}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={t.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleQuickStatusChange(t.id, e.target.value);
                          }}
                          className="bg-[#111111] border border-[#2a2a2a] rounded px-2 py-0.5 text-[11px] font-mono text-[#eaeaea] outline-none cursor-pointer"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="DONE">Completed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            t.priority === "URGENT"
                              ? "bg-pink-950/60 text-pink-400 border-pink-800/50"
                              : t.priority === "HIGH"
                              ? "bg-amber-950/50 text-amber-400 border-amber-800/40"
                              : t.priority === "MEDIUM"
                              ? "bg-cyan-950/50 text-cyan-400 border-cyan-800/40"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#cccccc]">{t.assignee?.name}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(t);
                          }}
                          className="px-2.5 py-1 rounded bg-[#1f1f1f] hover:bg-[#2b2b2b] text-[11px] font-mono text-[#eaeaea] transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {nextCursor && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-1.5 rounded-lg bg-[#111111] border border-[#222222] text-xs font-mono text-[#eaeaea] hover:bg-[#1a1a1a] disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </main>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchSessionAndTasks}
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
    </div>
  );
}
