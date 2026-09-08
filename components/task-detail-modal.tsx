"use client";

import { useState, useEffect } from "react";
import {
  X,
  Send,
  MessageSquare,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string; department?: string | null };
}

interface TaskDetailModalProps {
  task: { id: string } | null;
  currentUser: SessionUser | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const COMMON_REASONS = [
  "Client feedback delay",
  "Waiting for dependency/assets",
  "Technical blocker encountered",
  "Scope/requirement change",
  "Workload priority shift",
];

export function TaskDetailModal({
  task,
  currentUser,
  isOpen,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [taskDetail, setTaskDetail] = useState<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: string | null;
    assignee?: { name?: string };
    company?: { name?: string };
    comments?: Comment[];
  } | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      fetchTaskDetails(task.id);
      setIsEditing(false);
      setIsRescheduling(false);
    }
  }, [task, isOpen]);

  async function fetchTaskDetails(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      const data = await res.json();
      if (res.ok) {
        setTaskDetail(data);
        setStatus(data.status);
        setPriority(data.priority);
        setEditTitle(data.title);
        setEditDescription(data.description || "");
        setEditPriority(data.priority);
        setNewDueDate(
          data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : ""
        );
        setComments(data.comments || []);
        setError(null);
      } else {
        setError(data.error || "Unable to load task");
      }
    } catch (e) {
      console.error(e);
      setError("Unable to load task");
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!taskDetail) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handlePriorityChange(newPriority: string) {
    if (!taskDetail) return;
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        setPriority(newPriority);
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskDetail || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to update task.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to update task.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskDetail) return;
    if (!newDueDate) {
      setRescheduleError("Please select a new due date.");
      return;
    }
    if (!rescheduleReason.trim()) {
      setRescheduleError("Please provide a reason for rescheduling.");
      return;
    }

    setSavingReschedule(true);
    setRescheduleError(null);

    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: new Date(newDueDate).toISOString(),
          rescheduleReason: rescheduleReason.trim(),
        }),
      });

      if (res.ok) {
        setIsRescheduling(false);
        setRescheduleReason("");
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      } else {
        const d = await res.json();
        setRescheduleError(d.error || "Failed to reschedule task.");
      }
    } catch (e) {
      console.error(e);
      setRescheduleError("Failed to reschedule task.");
    } finally {
      setSavingReschedule(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !taskDetail) return;
    setLoadingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComment(false);
    }
  }

  async function handleDeleteTask() {
    if (!taskDetail || !confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onTaskUpdated();
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!isOpen) return null;
  if (!taskDetail) {
    return (
      <div className="modal-overlay">
        <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 text-xs font-mono text-muted">
          {error || "Loading task details..."}
          <button onClick={onClose} className="mt-4 block text-foreground hover:underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser?.role ?? "");

  return (
    <div className="modal-overlay">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-t-xl sm:rounded-xl overflow-hidden max-h-[92dvh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {/* Status Dropdown */}
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="min-h-11 bg-surface border border-border hover:border-primary text-base md:text-xs font-medium text-foreground rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-colors"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Completed</option>
            </select>

            {/* Priority Selector */}
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="min-h-11 bg-surface border border-border hover:border-primary text-base md:text-xs font-medium text-foreground rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-colors"
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Task Button */}
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setIsRescheduling(false);
              }}
              title="Edit Task"
              className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isEditing
                  ? "bg-primary text-on-primary"
                  : "text-foreground hover:text-foreground bg-hover hover:bg-hover border border-border"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Cancel Edit" : "Edit Task"}</span>
            </button>

            {/* Reschedule Button */}
            <button
              onClick={() => {
                setIsRescheduling(!isRescheduling);
                setIsEditing(false);
              }}
              title="Reschedule Due Date"
              className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isRescheduling
                  ? "bg-primary text-on-primary"
                  : "text-foreground hover:text-foreground bg-hover hover:bg-hover border border-border"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isRescheduling ? "Close" : "Reschedule"}</span>
            </button>

            {/* Delete button (Manager / Admin) */}
            {isManagerOrAdmin && (
              <button
                onClick={handleDeleteTask}
                title="Delete Task"
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-foreground transition-colors rounded-lg hover:bg-hover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reschedule Task Panel */}
          {isRescheduling && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-3.5">
              <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-hover text-muted">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">
                    Reschedule Task (টাস্ক রিসিডিউল করুন)
                  </h3>
                </div>
                <span className="text-[11px] text-muted">
                  Current Due:{" "}
                  <strong className="text-foreground">
                    {taskDetail.dueDate
                      ? new Date(taskDetail.dueDate).toLocaleDateString()
                      : "Not set"}
                  </strong>
                </span>
              </div>

              {rescheduleError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <form onSubmit={handleRescheduleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      New Due Date (নতুন তারিখ) *
                    </label>
                    <input
                      type="date"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      Quick Reason Preset
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setRescheduleReason(e.target.value);
                      }}
                      className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground outline-none transition-colors"
                    >
                      <option value="">Select a common reason...</option>
                      {COMMON_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">
                    Reason for Rescheduling (রিসিডিউল করার কারণ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Waiting for client response, extra testing required..."
                    className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReschedule}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingReschedule && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Confirm Reschedule</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Task Form vs Normal View */}
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              className="p-4 rounded-xl bg-input border border-primary/20 space-y-3.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Edit Task Information</span>
                <span className="text-[11px] text-primary">All team members can edit</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Task details and instructions..."
                  className="w-full bg-surface border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">{taskDetail.title}</h2>
              <p className="text-xs text-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                {taskDetail.description || "No description provided."}
              </p>
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-input border border-border text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">
                Assignee
              </span>
              <span className="text-foreground font-medium block mt-1 truncate">
                {taskDetail.assignee?.name || "Unassigned"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">
                Due Date
              </span>
              <span className="text-foreground font-medium block mt-1">
                {taskDetail.dueDate ? new Date(taskDetail.dueDate).toLocaleDateString() : "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">
                Workspace
              </span>
              <span className="text-primary font-medium block mt-1 truncate">
                {taskDetail.company?.name || "Standard"}
              </span>
            </div>
          </div>

          {/* Comments and Activity Stream */}
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Activity & Comments ({comments.length})</span>
            </h4>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-muted py-1">No updates or comments yet.</p>
              ) : (
                comments.map((c) => {
                  const isRescheduleEvent = c.body.includes("[Task Rescheduled]");
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        isRescheduleEvent
                          ? "bg-hover border-border text-foreground"
                          : "bg-hover border-border text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {isRescheduleEvent && (
                            <Calendar className="w-3.5 h-3.5 text-muted inline" />
                          )}
                          {c.author?.name}
                          {c.author?.role && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-hover text-muted font-normal">
                              {c.author.role}
                            </span>
                          )}
                        </span>
                        <span>
                          {new Date(c.createdAt).toLocaleDateString()}{" "}
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write an update or comment..."
                className="flex-1 bg-input border border-border focus:border-primary rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loadingComment || !newComment.trim()}
                className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
