"use client";

import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  assignee: { id: string; name: string; email: string; department?: string | null };
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
];

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onNewTaskClick }: KanbanBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    return true;
  });

  const priorityBadges: Record<string, { label: string; style: string }> = {
    LOW: { label: "Low", style: "bg-zinc-900 text-zinc-400 border-zinc-800" },
    MEDIUM: { label: "Medium", style: "bg-cyan-950/50 text-cyan-400 border-cyan-800/40" },
    HIGH: { label: "High", style: "bg-amber-950/50 text-amber-400 border-amber-800/40" },
    URGENT: { label: "Urgent", style: "bg-pink-950/60 text-pink-400 border-pink-800/50 animate-pulse" },
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
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
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
              className="px-3 py-1.5 rounded-md bg-[#0070f3] text-white text-xs font-medium hover:bg-[#0060df] transition-all flex items-center gap-1.5 ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Grid Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="group bg-[#0f0f0f] hover:bg-[#141414] border border-[#222222] hover:border-[#3b3b3b] hover:shadow-vercel-glow rounded-lg p-3.5 transition-all cursor-pointer flex flex-col gap-3 relative"
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-[#eaeaea] group-hover:text-white line-clamp-2 leading-relaxed">
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

                        {/* Footer Info & Quick Status Move */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] text-[11px] text-[#777777]">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333333] flex items-center justify-center text-[10px] font-mono font-medium text-white">
                              {task.assignee?.name?.[0] || "U"}
                            </div>
                            <span className="font-mono text-[#aaaaaa] truncate max-w-[90px]">
                              {task.assignee?.name?.split(" ")[0]}
                            </span>
                          </div>

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
                              onChange={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, e.target.value as Task["status"]);
                              }}
                              className="bg-[#111111] hover:bg-[#1a1a1a] text-[10px] text-[#aaaaaa] border border-[#2e2e2e] rounded px-1.5 py-0.5 font-mono cursor-pointer outline-none"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Completed</option>
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
