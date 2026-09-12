"use client";

import { useState } from "react";
import { MessageSquare, Plus, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee?: { id?: string; name?: string; email?: string; department?: string | null };
  assignees?: { user?: { id?: string; name?: string; email?: string; department?: string | null } }[];
  creator: { id: string; name: string };
  _count?: { comments: number };
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
  onNewTaskClick?: () => void;
}

const COLUMNS: { key: Task["status"]; label: string; color: string; badge: string }[] = [
  { key: "TODO", label: "To Do", color: "border-[#333333]", badge: "badge-todo" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-900/50", badge: "badge-in_progress" },
  { key: "IN_REVIEW", label: "In Review", color: "border-amber-900/50", badge: "badge-in_review" },
  { key: "DONE", label: "Completed", color: "border-emerald-900/50", badge: "badge-done" },
  { key: "CANCELLED", label: "Cancelled", color: "border-rose-900/50", badge: "badge-cancelled" },
];

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onNewTaskClick }: KanbanBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    return true;
  });

  const priorityBadges: Record<string, { label: string; style: string }> = {
    LOW: { label: "Low", style: "bg-slate-800/60 text-slate-400 border-slate-700/60" },
    MEDIUM: { label: "Medium", style: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    HIGH: { label: "High", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    URGENT: { label: "Urgent", style: "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" },
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header controls & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] p-4 rounded-xl border border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#888888]">Filter Priority:</span>
          <div className="flex items-center gap-1.5 bg-[#111111] p-1 rounded-lg border border-[#222222]">
            {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`min-h-11 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                  filterPriority === p
                    ? "bg-[#222222] text-white border border-[#444444]"
                    : "text-[#888888] hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#888888]">
            Showing <strong className="text-white">{filteredTasks.length}</strong> tasks
          </span>
          {onNewTaskClick && (
            <button
              onClick={onNewTaskClick}
              className="min-h-11 px-3 py-1.5 rounded-md bg-[#0070f3] text-white text-xs font-medium hover:bg-[#0060df] transition-all flex items-center gap-1.5 ml-0 sm:ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Grid Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className={`flex flex-col rounded-xl bg-[#080808] border ${col.color} p-3.5 min-h-[500px] transition-all`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f1f1f]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${col.badge}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-mono text-[#888888]">({colTasks.length})</span>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 border border-dashed border-[#222222] rounded-lg text-center p-4">
                    <span className="text-xs text-[#555555] font-mono">No tasks in this column</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const badgeInfo = priorityBadges[task.priority];
                    const isDone = task.status === "DONE";

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`group rounded-lg p-3.5 transition-all cursor-pointer flex flex-col gap-3 relative ${
                          isDone
                            ? "bg-emerald-50 dark:bg-emerald-950/25 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-600/60 border-l-4 border-l-emerald-500 opacity-90 hover:opacity-100 shadow-sm"
                            : "bg-white dark:bg-[#0f0f0f] hover:bg-slate-50 dark:hover:bg-[#141414] border border-slate-200 dark:border-[#222222] hover:border-slate-300 dark:hover:border-[#3b3b3b] shadow-sm hover:shadow-md dark:hover:shadow-vercel-glow"
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-xs font-semibold line-clamp-2 leading-relaxed transition-colors ${
                              isDone ? "text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200" : "text-slate-900 dark:text-[#eaeaea] group-hover:text-slate-950 dark:group-hover:text-white"
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border shrink-0 ${badgeInfo.style}`}
                          >
                            {badgeInfo.label}
                          </span>
                        </div>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-[11px] text-[#888888] line-clamp-2 leading-normal">
                            {task.description}
                          </p>
                        )}

                        {/* Due Date & Time Badge */}
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>
                              {new Date(task.dueDate).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        )}

                        {/* Footer Info & Quick Status Move */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] text-[11px] text-[#777777]">
                          {(() => {
                            const allAssignees =
                              task.assignees && task.assignees.length > 0
                                ? task.assignees.map((a) => a.user).filter(Boolean)
                                : task.assignee
                                ? [task.assignee]
                                : [];

                            if (allAssignees.length === 0) {
                              return <span className="font-mono text-[#666666]">Unassigned</span>;
                            }

                            if (allAssignees.length === 1) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333333] flex items-center justify-center text-[10px] font-mono font-medium text-white">
                                    {allAssignees[0]?.name?.[0]?.toUpperCase() || "U"}
                                  </div>
                                  <span className="font-mono text-[#aaaaaa] truncate max-w-[90px]">
                                    {allAssignees[0]?.name?.split(" ")[0]}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div
                                className="flex items-center gap-1.5"
                                title={allAssignees.map((a) => a?.name).filter(Boolean).join(", ")}
                              >
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {allAssignees.slice(0, 3).map((a, idx) => (
                                    <div
                                      key={a?.id || idx}
                                      className="w-5 h-5 rounded-full bg-[#222222] border border-[#111111] flex items-center justify-center text-[9px] font-mono font-semibold text-white shrink-0"
                                    >
                                      {a?.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                  ))}
                                </div>
                                <span className="font-mono text-[#aaaaaa] text-[10px] truncate max-w-[70px]">
                                  {allAssignees[0]?.name?.split(" ")[0]}
                                </span>
                                <span className="text-[9px] font-mono font-semibold text-indigo-400 bg-indigo-500/20 px-1 rounded">
                                  +{allAssignees.length - 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-3">
                            {task._count && task._count.comments > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-mono text-[#888888]">
                                <MessageSquare className="w-3 h-3" />
                                {task._count.comments}
                              </span>
                            )}

                            {/* Quick status selector */}
                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
                              className={`text-[11px] rounded-md px-2 py-1 outline-none cursor-pointer transition-all ${
                                task.status === "DONE"
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:border-emerald-500"
                                  : task.status === "CANCELLED"
                                  ? "bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/60 text-rose-800 dark:text-rose-300 hover:border-rose-500"
                                  : "bg-slate-100 dark:bg-[#111111] hover:bg-slate-200 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-[#aaaaaa] border border-slate-300 dark:border-[#2e2e2e]"
                              }`}
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
