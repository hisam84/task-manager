"use client";

import { useState } from "react";
import { MessageSquare, Plus, Clock, Filter } from "lucide-react";

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

const COLUMNS: { key: Task["status"]; label: string; borderColor: string; headerBadge: string }[] = [
  { key: "TODO", label: "To Do", borderColor: "border-slate-300 dark:border-slate-700/60", headerBadge: "badge-todo" },
  { key: "IN_PROGRESS", label: "In Progress", borderColor: "border-blue-300 dark:border-blue-900/50", headerBadge: "badge-in_progress" },
  { key: "IN_REVIEW", label: "In Review", borderColor: "border-purple-300 dark:border-purple-900/50", headerBadge: "badge-in_review" },
  { key: "DONE", label: "Completed", borderColor: "border-emerald-300 dark:border-emerald-900/50", headerBadge: "badge-done" },
  { key: "CANCELLED", label: "Cancelled", borderColor: "border-rose-300 dark:border-rose-900/50", headerBadge: "badge-cancelled" },
];

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onNewTaskClick }: KanbanBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [activeMobileColumn, setActiveMobileColumn] = useState<string>("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    return true;
  });

  const priorityBadges: Record<string, { label: string; style: string }> = {
    LOW: {
      label: "Low",
      style: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    },
    MEDIUM: {
      label: "Medium",
      style: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
    },
    HIGH: {
      label: "High",
      style: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    },
    URGENT: {
      label: "Urgent",
      style: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30 animate-pulse",
    },
  };

  const scrollToColumn = (colKey: string) => {
    setActiveMobileColumn(colKey);
    const container = document.getElementById("kanban-scroll-container");
    if (!container) return;

    if (colKey === "ALL") {
      container.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(`kanban-col-${colKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-5">
      {/* Header controls & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Priority Filter */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold hidden sm:inline">Priority:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 max-w-full">
            {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => {
              const isSelected = filterPriority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPriority(p)}
                  className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {p === "ALL" ? "All" : p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Count & Add Task button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{filteredTasks.length}</strong> tasks
          </span>

          {onNewTaskClick && (
            <button
              type="button"
              onClick={onNewTaskClick}
              className="h-8.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Column Switcher Tabs */}
      <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => scrollToColumn("ALL")}
          className={`h-8.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeMobileColumn === "ALL"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <span>All Columns</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 dark:bg-black/20">
            {filteredTasks.length}
          </span>
        </button>

        {COLUMNS.map((col) => {
          const count = filteredTasks.filter((t) => t.status === col.key).length;
          const isActive = activeMobileColumn === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => scrollToColumn(col.key)}
              className={`h-8.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>{col.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-white/20 dark:bg-black/20" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Container */}
      {/*
        - Mobile: Snap carousel (w-[85vw] sm:w-[320px] shrink-0 snap-center).
        - Tablet: Smooth horizontal scroll (w-[290px] shrink-0).
        - XL Desktop: 5 equal columns grid (grid-cols-5).
      */}
      <div
        id="kanban-scroll-container"
        className="flex xl:grid xl:grid-cols-5 overflow-x-auto xl:overflow-x-visible gap-3.5 sm:gap-4.5 pb-4 px-0.5 snap-x snap-mandatory scrollbar-thin"
      >
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              id={`kanban-col-${col.key}`}
              className={`w-[85vw] max-w-[340px] sm:w-[320px] xl:w-auto shrink-0 snap-center flex flex-col rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border ${col.borderColor} p-3 sm:p-3.5 min-h-[480px] max-h-[calc(100dvh-270px)] sm:max-h-[720px] transition-all`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.headerBadge}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    ({colTasks.length})
                  </span>
                </div>

                {onNewTaskClick && col.key === "TODO" && (
                  <button
                    type="button"
                    onClick={onNewTaskClick}
                    title="Add task to To Do"
                    className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center p-4">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      No tasks in this column
                    </span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const badgeInfo = priorityBadges[task.priority] || priorityBadges.MEDIUM;
                    const isDone = task.status === "DONE";
                    const isCancelled = task.status === "CANCELLED";

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`group rounded-xl p-3 sm:p-3.5 transition-all cursor-pointer flex flex-col gap-2.5 relative ${
                          isDone
                            ? "bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/40 border-l-4 border-l-emerald-500 shadow-xs hover:shadow-md"
                            : isCancelled
                            ? "bg-rose-50/50 dark:bg-rose-950/15 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 border-l-4 border-l-rose-500 opacity-85 hover:opacity-100 shadow-xs hover:shadow-md"
                            : "bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md"
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-xs sm:text-sm font-semibold line-clamp-2 leading-snug transition-colors ${
                              isDone
                                ? "text-emerald-900 dark:text-emerald-200"
                                : isCancelled
                                ? "text-rose-900 dark:text-rose-200 line-through"
                                : "text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${badgeInfo.style}`}
                          >
                            {badgeInfo.label}
                          </span>
                        </div>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Due Date & Time Badge */}
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-md w-fit">
                            <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
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

                        {/* Footer: Assignee(s), Comments, and Quick Status Move */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                          {/* Assignees */}
                          {(() => {
                            const allAssignees =
                              task.assignees && task.assignees.length > 0
                                ? task.assignees.map((a) => a.user).filter(Boolean)
                                : task.assignee
                                ? [task.assignee]
                                : [];

                            if (allAssignees.length === 0) {
                              return <span className="text-[11px] text-slate-400">Unassigned</span>;
                            }

                            if (allAssignees.length === 1) {
                              return (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {allAssignees[0]?.name?.[0]?.toUpperCase() || "U"}
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[85px] sm:max-w-[100px]">
                                    {allAssignees[0]?.name?.split(" ")[0]}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div
                                className="flex items-center gap-1"
                                title={allAssignees.map((a) => a?.name).filter(Boolean).join(", ")}
                              >
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {allAssignees.slice(0, 3).map((a, idx) => (
                                    <div
                                      key={a?.id || idx}
                                      className="w-5.5 h-5.5 rounded-full bg-indigo-600 text-white border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold shrink-0"
                                    >
                                      {a?.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 px-1 py-0.2 rounded-md">
                                  +{allAssignees.length - 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-2">
                            {task._count && task._count.comments > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <MessageSquare className="w-3 h-3" />
                                <span>{task._count.comments}</span>
                              </span>
                            )}

                            {/* Quick status selector */}
                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
                              className={`text-[11px] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer transition-all border shadow-xs ${
                                task.status === "DONE"
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300"
                                  : task.status === "CANCELLED"
                                  ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/60 text-rose-800 dark:text-rose-300"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700/60 text-blue-800 dark:text-blue-300"
                                  : task.status === "IN_REVIEW"
                                  ? "bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700/60 text-purple-800 dark:text-purple-300"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
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
