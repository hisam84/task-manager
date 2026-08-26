"use client";

import { useState, useEffect } from "react";
import { X, Send, MessageSquare, User, Calendar, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string; department?: string | null };
}

interface TaskDetailModalProps {
  task: any | null;
  currentUser: any;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailModal({ task, currentUser, isOpen, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      fetchTaskDetails(task.id);
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
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
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

  if (!isOpen || !taskDetail) return null;

  const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#222222] rounded-xl shadow-vercel-card overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f1f] bg-[#050505]">
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="bg-[#111111] border border-[#333333] focus:border-[#0070f3] text-xs font-mono text-white rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Completed</option>
            </select>

            <select
              value={priority}
              disabled={!isManagerOrAdmin}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="bg-[#111111] border border-[#333333] focus:border-[#0070f3] text-xs font-mono text-white rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {isManagerOrAdmin && (
              <button
                onClick={handleDeleteTask}
                title="Delete Task"
                className="p-1 rounded text-[#777777] hover:text-red-400 hover:bg-red-950/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#777777] hover:text-white transition-colors p-1 rounded hover:bg-[#1a1a1a]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{taskDetail.title}</h2>
            <p className="text-xs text-[#888888] mt-1.5 leading-relaxed">
              {taskDetail.description || "No description provided."}
            </p>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#111111] border border-[#1f1f1f] text-xs font-mono">
            <div>
              <span className="text-[#666666] block text-[10px]">ASSIGNEE</span>
              <span className="text-[#eaeaea] font-medium block mt-0.5 truncate">
                {taskDetail.assignee?.name}
              </span>
            </div>
            <div>
              <span className="text-[#666666] block text-[10px]">DUE DATE</span>
              <span className="text-[#eaeaea] font-medium block mt-0.5">
                {taskDetail.dueDate ? new Date(taskDetail.dueDate).toLocaleDateString() : "—"}
              </span>
            </div>
            <div>
              <span className="text-[#666666] block text-[10px]">COMPANY</span>
              <span className="text-cyan-400 font-medium block mt-0.5 truncate">
                {taskDetail.company?.name}
              </span>
            </div>
          </div>

          {/* Threaded Comments */}
          <div className="border-t border-[#1f1f1f] pt-4 space-y-3">
            <h4 className="text-xs font-mono font-medium text-[#eaeaea] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#0070f3]" />
              <span>Comments ({comments.length})</span>
            </h4>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-[#555555] font-mono py-1">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-md bg-[#111111] border border-[#1f1f1f] text-xs">
                    <div className="flex items-center justify-between text-[10px] text-[#777777] mb-1 font-mono">
                      <span className="font-medium text-[#eaeaea]">{c.author?.name}</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-[#cccccc] text-xs leading-normal">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#555555] outline-none"
              />
              <button
                type="submit"
                disabled={loadingComment || !newComment.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
