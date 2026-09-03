"use client";

import { useState, useEffect } from "react";
import { X, Plus, AlertCircle } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserCompanyId?: string | null;
}

export function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE">("TODO");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        if (data.length > 0) setAssigneeId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assigneeId) {
      setError("Please provide a task title and select an assignee.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          assigneeId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setTitle("");
      setDescription("");
      setDueDate("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-[#222222] rounded-xl shadow-vercel-card overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0070f3]/10 border border-[#0070f3]/30 flex items-center justify-center text-[#0070f3]">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Create New Task</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#777777] hover:text-white transition-colors p-1 rounded-md hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Edge Middleware for Geolocation Routing"
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#555555] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or reproduction steps..."
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#555555] outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Assignee *</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) — {u.department || "General"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer font-mono"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE")}
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer font-mono"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] text-xs font-medium text-[#888888] hover:text-white border border-[#222222] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
