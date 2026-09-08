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

const COLUMNS: { key: Task["status"]; label: string; badge: string }[] = [
  { key: "TODO", label: "To Do", badge: "badge-todo" },
  { key: "IN_PROGRESS", label: "In Progress", badge: "badge-in_progress" },
  { key: "IN_REVIEW", label: "In Review", badge: "badge-in_review" },
  { key: "DONE", label: "Completed", badge: "badge-done" },
];

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onNewTaskClick }: KanbanBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    return true;
  });

  const priorityBadges: Record<string, { label: string; style: string }> = {
    LOW: { label: "Low", style: "priority-low border" },
    MEDIUM: { label: "Medium", style: "priority-medium border" },
    HIGH: { label: "High", style: "priority-high border" },
    URGENT: { label: "Urgent", style: "priority-urgent border" },
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Filter Priority:</span>
          <div className="flex items-center gap-1.5 bg-input p-1 rounded-lg border border-border">
            {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`min-h-11 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                  filterPriority === p
                    ? "bg-primary text-on-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">
            Showing <strong className="text-foreground">{filteredTasks.length}</strong> tasks
          </span>
          {onNewTaskClick && (
            <button onClick={onNewTaskClick} className="btn-primary text-xs ml-0 sm:ml-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className="flex flex-col rounded-xl bg-surface border border-border p-3.5 min-h-[500px]"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${col.badge}`}>{col.label}</span>
                  <span className="text-xs text-muted">({colTasks.length})</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 border border-dashed border-border rounded-lg text-center p-4">
                    <span className="text-sm text-muted">No tasks in this column</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const badgeInfo = priorityBadges[task.priority];

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="group bg-input hover:bg-hover border border-border rounded-lg p-3.5 transition-colors cursor-pointer flex flex-col gap-3 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-2 leading-relaxed">
                            {task.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${badgeInfo.style}`}>
                            {badgeInfo.label}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted line-clamp-2 leading-normal">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-hover border border-border flex items-center justify-center text-xs font-medium text-foreground">
                              {task.assignee?.name?.[0] || "U"}
                            </div>
                            <span className="truncate max-w-[90px]">{task.assignee?.name?.split(" ")[0]}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {task._count && task._count.comments > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted">
                                <MessageSquare className="w-3 h-3" />
                                {task._count.comments}
                              </span>
                            )}

                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, e.target.value as Task["status"]);
                              }}
                              className="bg-input hover:bg-hover text-xs text-foreground border border-border rounded px-1.5 py-0.5 cursor-pointer outline-none"
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
