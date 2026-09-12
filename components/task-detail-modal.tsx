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
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { canDeleteTask } from "@/lib/access";
import TaskCompleteModal from "@/components/task-complete-modal";

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
    assignee?: { id?: string; name?: string; email?: string; avatar?: string | null; department?: string | null };
    assignees?: {
      user?: { id?: string; name?: string; email?: string; avatar?: string | null; department?: string | null; role?: string };
    }[];
    creator?: { id?: string; name?: string; email?: string; role?: string };
    company?: { id?: string; name?: string; notifyAssignerOnTaskComplete?: boolean; taskCompletionNotifyMode?: string };
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
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

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
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; name: string; email: string; role: string; order?: number; department?: string | null }[]
  >([]);
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

        const initialIds: string[] = [];
        if (data.assignees && Array.isArray(data.assignees) && data.assignees.length > 0) {
          initialIds.push(...data.assignees.map((a: any) => a.user?.id || a.userId).filter(Boolean));
        } else if (data.assignee?.id) {
          initialIds.push(data.assignee.id);
        }
        setEditAssigneeIds(initialIds);

        setError(null);
      } else {
        setError(data.error || "Unable to load task");
      }

      // Fetch users for edit list
      try {
        const uRes = await fetch("/api/users");
        if (uRes.ok) {
          const uData = await uRes.json();
          if (Array.isArray(uData)) {
            setAvailableUsers(uData);
          }
        }
      } catch (uErr) {
        console.error(uErr);
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
    } else if (val === "DONE") {
      const isManual = (taskDetail?.company as any)?.taskCompletionNotifyMode === "MANUAL";
      if (isManual) {
        setIsCancelling(false);
        setIsEditing(false);
        setIsRescheduling(false);
        setIsCompleteModalOpen(true);
      } else {
        setIsCancelling(false);
        setIsEditing(false);
        setIsRescheduling(false);
        handleConfirmComplete({
          notifyCreatorOnComplete: (taskDetail?.company as any)?.notifyAssignerOnTaskComplete !== false,
        });
      }
    } else {
      setIsCancelling(false);
      handleStatusChange(val);
    }
  }

  async function handleConfirmComplete(options: {
    notifyCreatorOnComplete: boolean;
    completionNote?: string;
  }) {
    if (!taskDetail) return;
    setUpdatingStatus(true);
    setNotifySuccessMessage(null);
    setNotifyErrorMessage(null);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DONE",
          notifyCreatorOnComplete: options.notifyCreatorOnComplete,
          completionNote: options.completionNote,
        }),
      });
      if (res.ok) {
        setStatus("DONE");
        fetchTaskDetails(taskDetail.id);
        onTaskUpdated();
        setIsCompleteModalOpen(false);
        if (options.notifyCreatorOnComplete && taskDetail.creator?.email) {
          setNotifySuccessMessage(
            `Task completed and email notice sent to ${taskDetail.creator.name || taskDetail.creator.email}`
          );
        } else {
          setNotifySuccessMessage("Task marked as completed successfully.");
        }
      } else {
        const d = await res.json();
        setNotifyErrorMessage(d.error || "Failed to update task status.");
      }
    } catch (err) {
      console.error("Error completing task:", err);
      setNotifyErrorMessage("Failed to update task status.");
    } finally {
      setUpdatingStatus(false);
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
          assigneeIds: editAssigneeIds.length > 0 ? editAssigneeIds : undefined,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-xs text-slate-600 dark:text-slate-400 shadow-2xl">
          <p>{error || "Loading task details..."}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* Modal Top Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          {/* Row 1: Status & Priority on Left, Dedicated Close Button on Far Right */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Status & Priority Badges */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Status Dropdown */}
              <select
                value={status}
                onChange={(e) => onStatusDropdownChange(e.target.value)}
                disabled={updatingStatus}
                className={`h-9 border text-xs font-semibold rounded-xl px-3 py-1 outline-none cursor-pointer transition-colors shadow-xs ${
                  status === "CANCELLED"
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:border-rose-400"
                    : status === "DONE"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400"
                    : status === "IN_PROGRESS"
                    ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 hover:border-blue-400"
                    : status === "IN_REVIEW"
                    ? "bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 hover:border-purple-400"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-slate-400"
                }`}
              >
                <option value="TODO" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">To Do</option>
                <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">In Progress</option>
                <option value="IN_REVIEW" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">In Review</option>
                <option value="DONE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Completed</option>
                <option value="CANCELLED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Cancelled</option>
              </select>

              {/* Priority Selector */}
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`h-9 border text-xs font-semibold rounded-xl px-3 py-1 outline-none cursor-pointer transition-colors shadow-xs ${
                  priority === "URGENT"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                    : priority === "HIGH"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : priority === "LOW"
                    ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="LOW" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Low Priority</option>
                <option value="MEDIUM" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Medium Priority</option>
                <option value="HIGH" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">High Priority</option>
                <option value="URGENT" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Urgent Priority</option>
              </select>
            </div>

            {/* Permanent Top-Right Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Dedicated Action Toolbar */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex-wrap">
            {/* Edit Task Button */}
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setIsRescheduling(false);
                setIsCancelling(false);
              }}
              title="Edit Task"
              className={`flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs ${
                isEditing
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : "text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Cancel Edit" : "Edit Task"}</span>
            </button>

            {/* Reschedule Button */}
            <button
              type="button"
              onClick={() => {
                setIsRescheduling(!isRescheduling);
                setIsEditing(false);
                setIsCancelling(false);
                setShowNotifyPanel(false);
              }}
              title="Reschedule Due Date & Time"
              className={`flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs ${
                isRescheduling
                  ? "bg-amber-600 text-white shadow-amber-600/20"
                  : "text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60"
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
                className="flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-medium text-sky-800 dark:text-sky-300 bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 border border-sky-300 dark:border-sky-700/60 transition-all cursor-pointer shadow-xs"
              >
                {reopeningTask ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Reopen</span>
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
                className={`flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs ${
                  isCancelling
                    ? "bg-rose-600 text-white shadow-rose-600/20"
                    : "text-rose-800 dark:text-rose-300 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-700/60"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isCancelling ? "Dismiss" : "Cancel Task"}</span>
              </button>
            )}

            {/* Email Assigner Button */}
            {(status === "DONE" || taskDetail?.status === "DONE") && (
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(true)}
                title="Send completion email to the person who assigned this task"
                className="flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-medium transition-all text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/60 cursor-pointer shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Assigner</span>
              </button>
            )}

            {/* Delete button (aligned right) */}
            {hasDeletePermission && (
              <button
                type="button"
                onClick={handleDeleteTask}
                title="Delete Task"
                className="sm:ml-auto h-8.5 w-8.5 rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 shrink-0">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                      Task Cancelled
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      This task has been marked as cancelled. Work is discontinued.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReopenTask}
                  disabled={reopeningTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 transition-all cursor-pointer shadow-xs"
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
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Project deprioritized, client cancelled, duplicate request..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyOnCancelCheck"
                    checked={notifyOnCancel}
                    onChange={(e) => setNotifyOnCancel(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
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
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Keep Task
                  </button>
                  <button
                    type="submit"
                    disabled={savingCancel}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-sm shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
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
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                      Task Completed
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Assigned by:{" "}
                      <strong className="text-slate-950 dark:text-white font-semibold">
                        {taskDetail.creator?.name || "Assigner"}
                      </strong>
                      {taskDetail.creator?.email ? ` (${taskDetail.creator.email})` : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Assigner</span>
                </button>
              </div>

              {notifySuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{notifySuccessMessage}</span>
                </div>
              )}

              {notifyErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{notifyErrorMessage}</span>
                </div>
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
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Quick Reason Preset
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setRescheduleReason(e.target.value);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-300 outline-none transition-colors"
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Rescheduling *
                  </label>
                  <input
                    type="text"
                    required
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Waiting for client response, extra testing required..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReschedule}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-sm shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {savingReschedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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

              {/* Assignees Selector */}
              {availableUsers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Assignees ({editAssigneeIds.length} Selected)
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
                    {availableUsers.map((u) => {
                      const isSelected = editAssigneeIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setEditAssigneeIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span>{u.name}</span>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {taskDetail.title}
              </h2>
              {taskDetail.description ? (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {taskDetail.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  No description provided.
                </p>
              )}
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider mb-1.5">
                Assignees
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {taskDetail.assignees && taskDetail.assignees.length > 0 ? (
                  taskDetail.assignees.map((a, idx) => {
                    const u = a.user;
                    return (
                      <span
                        key={u?.id || idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium max-w-full"
                        title={`${u?.name || "Employee"} (${u?.department || u?.role || ""})`}
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                          {u?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                        <span className="truncate">{u?.name || "Employee"}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {taskDetail.assignee?.name || "Unassigned"}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider mb-1.5">
                Assigned By
              </span>
              <span
                className="text-slate-900 dark:text-slate-100 font-semibold block truncate"
                title={taskDetail.creator?.email || ""}
              >
                {taskDetail.creator?.name || "Assigner"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider mb-1.5">
                Deadline
              </span>
              <div className="text-slate-900 dark:text-slate-100 font-medium flex items-start gap-1.5 text-[11px] leading-snug">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="break-words">
                  {taskDetail.dueDate ? formatDateTime(taskDetail.dueDate) : "Not set"}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider mb-1.5">
                Workspace
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold block truncate">
                {taskDetail.company?.name || "Standard"}
              </span>
            </div>
          </div>

          {/* Comments and Activity Stream */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Activity &amp; Comments ({comments.length})</span>
            </h4>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  No updates or comments yet.
                </p>
              ) : (
                comments.map((c) => {
                  const isRescheduleEvent = c.body.includes("[Task Rescheduled]");
                  const isCancelEvent = c.body.includes("[Task Cancelled]");
                  const isReopenEvent = c.body.includes("[Task Reopened]");
                  const isCompleteEvent = c.body.includes("[Task Completed");
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-2xl border text-xs transition-colors ${
                        isCancelEvent
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200"
                          : isReopenEvent
                          ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-200"
                          : isRescheduleEvent
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200"
                          : isCompleteEvent
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                          : "bg-slate-100/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {c.author?.avatar ? (
                            <img
                              src={c.author.avatar}
                              alt={c.author.name}
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 inline"
                            />
                          ) : null}
                          {isCancelEvent && (
                            <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 inline shrink-0" />
                          )}
                          {isReopenEvent && (
                            <RotateCcw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 inline shrink-0" />
                          )}
                          {isRescheduleEvent && (
                            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 inline shrink-0" />
                          )}
                          {isCompleteEvent && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline shrink-0" />
                          )}
                          <span>{c.author?.name}</span>
                          {c.author?.role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal">
                              {c.author.role}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}{" "}
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap font-normal text-slate-800 dark:text-slate-200">
                        {c.body}
                      </p>
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
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors shadow-xs"
              />
              <button
                type="submit"
                disabled={loadingComment || !newComment.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer shrink-0"
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

      {/* Task Completion Modal */}
      <TaskCompleteModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        task={taskDetail}
        onConfirm={handleConfirmComplete}
      />
    </div>
  );
}
