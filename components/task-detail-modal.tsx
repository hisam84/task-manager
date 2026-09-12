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
  Mail,
  CheckCircle2,
  Ban,
  RotateCcw,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { canDeleteTask } from "@/lib/access";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string; avatar?: string | null; department?: string | null };
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

const COMMON_CANCEL_REASONS = [
  "Task no longer needed",
  "Duplicate task",
  "Requirements changed / deprioritized",
  "Client requested cancellation",
  "Assigned incorrectly",
  "Postponed indefinitely",
];

function toDateTimeLocalString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not set";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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
    assignee?: { id?: string; name?: string; email?: string };
    creator?: { id?: string; name?: string; email?: string; role?: string };
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

  // Completion Notification State
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notifySuccessMessage, setNotifySuccessMessage] = useState<string | null>(null);
  const [notifyErrorMessage, setNotifyErrorMessage] = useState<string | null>(null);

  // Cancellation State
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [savingCancel, setSavingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [reopeningTask, setReopeningTask] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const setQuickHours = (hoursAhead: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursAhead);
    d.setMinutes(0, 0, 0);
    setNewDueDate(toDateTimeLocalString(d));
  };

  const setQuickDate = (daysAhead: number, targetHour: number = 17, targetMinute: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(targetHour, targetMinute, 0, 0);
    setNewDueDate(toDateTimeLocalString(d));
  };

  const setThisFriday = () => {
    const d = new Date();
    const day = d.getDay();
    let diff = 5 - day;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(17, 0, 0, 0);
    setNewDueDate(toDateTimeLocalString(d));
  };

  const setNextMonday = () => {
    const d = new Date();
    const day = d.getDay();
    let diff = (1 - day + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    d.setHours(10, 0, 0, 0);
    setNewDueDate(toDateTimeLocalString(d));
  };

  const setEndOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 17, 0, 0);
    setNewDueDate(toDateTimeLocalString(lastDay));
  };

  useEffect(() => {
    if (task && isOpen) {
      fetchTaskDetails(task.id);
      setIsEditing(false);
      setIsRescheduling(false);
      setIsCancelling(false);
      setCancelReason("");
      setCancelError(null);
      setShowNotifyPanel(false);
      setNotifySuccessMessage(null);
      setNotifyErrorMessage(null);
      setCompletionNote("");
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
        setEditDueDate(toDateTimeLocalString(data.dueDate));
        setNewDueDate(toDateTimeLocalString(data.dueDate));
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
    setNotifySuccessMessage(null);
    setNotifyErrorMessage(null);
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
        if (newStatus === "DONE") {
          setShowNotifyPanel(true);
        } else {
          setShowNotifyPanel(false);
        }
        if (newStatus !== "CANCELLED") {
          setIsCancelling(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function onStatusDropdownChange(val: string) {
    if (val === "CANCELLED") {
      setIsCancelling(true);
      setIsEditing(false);
      setIsRescheduling(false);
      setShowNotifyPanel(false);
    } else {
      setIsCancelling(false);
      handleStatusChange(val);
    }
  }

  async function handleConfirmCancel(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!taskDetail) return;
    setSavingCancel(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelReason: cancelReason.trim() || "Task marked as Cancelled",
          notifyOnCancel,
        }),
      });
      if (res.ok) {
        setStatus("CANCELLED");
        setIsCancelling(false);
        setCancelReason("");
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      } else {
        const d = await res.json();
        setCancelError(d.error || "Failed to cancel task.");
      }
    } catch (err) {
      console.error("Error cancelling task:", err);
      setCancelError("Failed to cancel task. Please try again.");
    } finally {
      setSavingCancel(false);
    }
  }

  async function handleReopenTask() {
    if (!taskDetail) return;
    setReopeningTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TODO",
        }),
      });
      if (res.ok) {
        setStatus("TODO");
        setIsCancelling(false);
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      }
    } catch (err) {
      console.error("Error reopening task:", err);
    } finally {
      setReopeningTask(false);
    }
  }

  async function handleSendCompletionNotification(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!taskDetail) return;
    setSendingNotification(true);
    setNotifyErrorMessage(null);
    setNotifySuccessMessage(null);

    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}/notify-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionNote: completionNote.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotifySuccessMessage(
          data.message || `Email sent successfully to ${taskDetail.creator?.name || "assigner"}`
        );
        setCompletionNote("");
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
      } else {
        setNotifyErrorMessage(data.error || "Failed to send completion email.");
      }
    } catch (err) {
      console.error("Error sending completion notification:", err);
      setNotifyErrorMessage("Failed to send email. Please check network connection.");
    } finally {
      setSendingNotification(false);
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
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
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
      setRescheduleError("Please select a new date and time.");
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

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setSessionUser(currentUser);
    } else {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.user) setSessionUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const hasDeletePermission = canDeleteTask(sessionUser?.role);

  async function handleDeleteTask() {
    if (!hasDeletePermission) {
      alert("Employees cannot delete tasks. Only an Admin or Manager can delete tasks.");
      return;
    }
    if (!taskDetail || !confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onTaskUpdated();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete task");
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!isOpen) return null;
  if (!taskDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-xs font-mono text-slate-400">
          {error || "Loading task details..."}
          <button onClick={onClose} className="mt-4 block text-white hover:underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {/* Status Dropdown */}
            <select
              value={status}
              onChange={(e) => onStatusDropdownChange(e.target.value)}
              disabled={updatingStatus}
              className={`min-h-11 border text-base md:text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-colors ${
                status === "CANCELLED"
                  ? "bg-rose-950/60 border-rose-500/40 text-rose-300 hover:border-rose-400"
                  : status === "DONE"
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                  : "bg-slate-900 border-slate-700 hover:border-indigo-500 text-slate-100"
              }`}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Priority Selector */}
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="min-h-11 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-base md:text-xs font-medium text-slate-100 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-colors"
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
                setIsCancelling(false);
              }}
              title="Edit Task"
              className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isEditing
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
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
                setIsCancelling(false);
                setShowNotifyPanel(false);
              }}
              title="Reschedule Due Date & Time"
              className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isRescheduling
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isRescheduling ? "Close" : "Reschedule"}</span>
            </button>

            {/* Cancel Task or Reopen Button */}
            {status === "CANCELLED" || taskDetail?.status === "CANCELLED" ? (
              <button
                type="button"
                onClick={handleReopenTask}
                disabled={reopeningTask}
                title="Reopen this task"
                className="flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer"
              >
                {reopeningTask ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Reopen Task</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsCancelling(!isCancelling);
                  setIsEditing(false);
                  setIsRescheduling(false);
                  setShowNotifyPanel(false);
                  setCancelError(null);
                }}
                title="Cancel this task"
                className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isCancelling
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isCancelling ? "Dismiss Cancel" : "Cancel Task"}</span>
              </button>
            )}

            {/* Email Assigner Button (when status is DONE or taskDetail is DONE) */}
            {(status === "DONE" || taskDetail?.status === "DONE") && (
              <button
                type="button"
                onClick={() => {
                  setShowNotifyPanel(!showNotifyPanel);
                  setIsEditing(false);
                  setIsRescheduling(false);
                  setIsCancelling(false);
                  setNotifySuccessMessage(null);
                  setNotifyErrorMessage(null);
                }}
                title="Send completion email to the person who assigned this task"
                className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showNotifyPanel
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{showNotifyPanel ? "Hide Email" : "Email Assigner"}</span>
              </button>
            )}

            {/* Delete button (Super Admin / Admin / Manager only - Regular employees cannot delete) */}
            {hasDeletePermission && (
              <button
                type="button"
                onClick={handleDeleteTask}
                title="Delete Task"
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cancelled Task Banner */}
          {(status === "CANCELLED" || taskDetail.status === "CANCELLED") && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 space-y-3 animate-fadeIn shadow-lg shadow-rose-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-rose-300 block">
                      Task Cancelled
                    </span>
                    <span className="text-[11px] text-slate-400">
                      This task has been marked as cancelled. Work is discontinued.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReopenTask}
                  disabled={reopeningTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                >
                  {reopeningTask ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Reopen Task</span>
                </button>
              </div>
            </div>
          )}

          {/* Cancel Task Panel */}
          {isCancelling && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-rose-200 dark:border-rose-500/30 space-y-3.5 animate-fadeIn shadow-lg shadow-rose-950/20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Ban className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Cancel Task
                  </h3>
                </div>
                <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
                  Status will change to Cancelled
                </span>
              </div>

              {cancelError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmCancel} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quick Reason Preset
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COMMON_CANCEL_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCancelReason(r)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          cancelReason === r
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Cancellation (ঐচ্ছিক / Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Project deprioritized, client cancelled, duplicate request..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyOnCancelCheck"
                    checked={notifyOnCancel}
                    onChange={(e) => setNotifyOnCancel(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label
                    htmlFor="notifyOnCancelCheck"
                    className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                  >
                    Send cancellation email notification to team member
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCancelling(false);
                      setCancelError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                  >
                    Keep Task
                  </button>
                  <button
                    type="submit"
                    disabled={savingCancel}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {savingCancel ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm Cancel Task</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Completed Task Notification Banner / Panel */}
          {(status === "DONE" || taskDetail.status === "DONE") && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3 animate-fadeIn shadow-lg shadow-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-300 block">
                      Task Completed
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Assigned by:{" "}
                      <strong className="text-slate-200">
                        {taskDetail.creator?.name || "Assigner"}
                      </strong>
                      {taskDetail.creator?.email ? ` (${taskDetail.creator.email})` : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowNotifyPanel(!showNotifyPanel);
                    setNotifySuccessMessage(null);
                    setNotifyErrorMessage(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    showNotifyPanel
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{showNotifyPanel ? "Hide Email Panel" : "Email Assigner"}</span>
                </button>
              </div>

              {notifySuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{notifySuccessMessage}</span>
                </div>
              )}

              {notifyErrorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{notifyErrorMessage}</span>
                </div>
              )}

              {showNotifyPanel && (
                <form
                  onSubmit={handleSendCompletionNotification}
                  className="pt-2.5 border-t border-slate-800 space-y-3 animate-fadeIn"
                >
                  <div className="text-[11px] text-slate-300 leading-relaxed">
                    যে এসাইন করেছে তাকে মেইল পাঠানোর জন্য নিচের অপশনাল নোট লিখুন এবং Send Completion Email চাপুন:
                    {taskDetail.creator?.email ? (
                      <span className="block mt-0.5 text-slate-400">
                        Recipient: <span className="text-emerald-400 font-mono">{taskDetail.creator.email}</span>
                      </span>
                    ) : (
                      <span className="block mt-0.5 text-amber-400">
                        Notice: Task assigner has no email address configured.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Completion Note / Remarks (ঐচ্ছিক বার্তা)
                    </label>
                    <textarea
                      rows={2}
                      value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      placeholder="e.g. Work is done, files are uploaded, please review..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNotifyPanel(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={sendingNotification || !taskDetail.creator?.email}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingNotification ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Completion Email</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Reschedule Task Panel */}
          {isRescheduling && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-amber-200 dark:border-amber-500/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Reschedule Deadline
                  </h3>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Current:{" "}
                  <strong className="text-slate-900 dark:text-slate-200">
                    {formatDateTime(taskDetail.dueDate)}
                  </strong>
                </span>
              </div>

              {rescheduleError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <form onSubmit={handleRescheduleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Due Date & Time *
                    </label>
                    <div
                      onClick={(e) => {
                        const input = e.currentTarget.querySelector("input") as HTMLInputElement;
                        input?.showPicker?.();
                      }}
                      className="relative flex items-center cursor-pointer group custom-picker-container"
                    >
                      <input
                        type="datetime-local"
                        required
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 group-hover:border-slate-400 dark:group-hover:border-slate-700 focus:border-amber-500 rounded-lg pl-3 pr-24 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none transition-colors cursor-pointer hide-native-picker"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          input?.showPicker?.();
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none"
                        title="Open Calendar"
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Calendar</span>
                      </button>
                    </div>

                    {/* Quick Date Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setQuickHours(2)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                        title="2 hours from now"
                      >
                        +2 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(0, 17)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        Today (5 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(0, 22)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        Tonight (10 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(1, 10)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        Tomorrow (10 AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(1, 17)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        Tomorrow (5 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(3, 17)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        In 3 Days
                      </button>
                      <button
                        type="button"
                        onClick={setThisFriday}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                        title="Upcoming Friday at 5:00 PM"
                      >
                        This Friday (5 PM)
                      </button>
                      <button
                        type="button"
                        onClick={setNextMonday}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                        title="Next Monday at 10:00 AM"
                      >
                        Next Monday (10 AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(7, 17)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        In 1 Week
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(14, 17)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        In 2 Weeks
                      </button>
                      <button
                        type="button"
                        onClick={setEndOfMonth}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer"
                      >
                        End of Month
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Quick Reason Preset
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setRescheduleReason(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none transition-colors"
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
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Reason for Rescheduling *
                  </label>
                  <input
                    type="text"
                    required
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Waiting for client response, extra testing required..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReschedule}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50"
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
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-indigo-500/30 space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Edit Task Information</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">All team members can edit</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Task details and instructions..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Due Date & Time
                    </label>
                    {editDueDate && (
                      <button
                        type="button"
                        onClick={() => setEditDueDate("")}
                        className="text-[10px] text-rose-500 dark:text-rose-400 hover:underline cursor-pointer font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input") as HTMLInputElement;
                      input?.showPicker?.();
                    }}
                    className="relative flex items-center cursor-pointer group custom-picker-container"
                  >
                    <input
                      type="datetime-local"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 group-hover:border-slate-400 dark:group-hover:border-slate-700 focus:border-indigo-500 rounded-lg pl-3 pr-24 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none transition-colors cursor-pointer hide-native-picker"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input?.showPicker?.();
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none"
                      title="Open Calendar"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Calendar</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/25 disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{taskDetail.title}</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                {taskDetail.description || "No description provided."}
              </p>
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Assignee
              </span>
              <span className="text-slate-100 font-medium block mt-1 truncate">
                {taskDetail.assignee?.name || "Unassigned"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Assigned By
              </span>
              <span
                className="text-slate-100 font-medium block mt-1 truncate"
                title={taskDetail.creator?.email || ""}
              >
                {taskDetail.creator?.name || "Assigner"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Deadline
              </span>
              <span className="text-slate-100 font-medium block mt-1 flex items-center gap-1.5 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{formatDateTime(taskDetail.dueDate)}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Workspace
              </span>
              <span className="text-indigo-400 font-medium block mt-1 truncate">
                {taskDetail.company?.name || "Standard"}
              </span>
            </div>
          </div>

          {/* Comments and Activity Stream */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Activity & Comments ({comments.length})</span>
            </h4>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">No updates or comments yet.</p>
              ) : (
                comments.map((c) => {
                  const isRescheduleEvent = c.body.includes("[Task Rescheduled]");
                  const isCancelEvent = c.body.includes("[Task Cancelled]");
                  const isReopenEvent = c.body.includes("[Task Reopened]");
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        isCancelEvent
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                          : isReopenEvent
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                          : isRescheduleEvent
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                          : "bg-slate-950/50 border-slate-800/80 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          {c.author?.avatar ? (
                            <img
                              src={c.author.avatar}
                              alt={c.author.name}
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-700 inline"
                            />
                          ) : null}
                          {isCancelEvent && (
                            <Ban className="w-3.5 h-3.5 text-rose-400 inline" />
                          )}
                          {isReopenEvent && (
                            <RotateCcw className="w-3.5 h-3.5 text-sky-400 inline" />
                          )}
                          {isRescheduleEvent && (
                            <Calendar className="w-3.5 h-3.5 text-amber-400 inline" />
                          )}
                          {c.author?.name}
                          {c.author?.role && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                              {c.author.role}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[10px]">
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
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loadingComment || !newComment.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
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
