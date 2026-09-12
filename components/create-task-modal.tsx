"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, AlertCircle, Calendar, Check, Users, Search, Lock } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  order?: number;
  department?: string | null;
  avatar?: string | null;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserCompanyId?: string | null;
  currentUserId?: string;
  currentUserRole?: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  currentUserRole,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED">("TODO");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmployee = currentUserRole === "EMPLOYEE";
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDateTimeLocal = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const setQuickHours = (hoursAhead: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursAhead);
    d.setMinutes(0, 0, 0);
    setDueDate(formatDateTimeLocal(d));
  };

  const setQuickDate = (daysAhead: number, targetHour: number = 17, targetMinute: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(targetHour, targetMinute, 0, 0);
    setDueDate(formatDateTimeLocal(d));
  };

  const setThisFriday = () => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sun, 5 is Fri
    let diff = 5 - day;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(17, 0, 0, 0);
    setDueDate(formatDateTimeLocal(d));
  };

  const setNextMonday = () => {
    const d = new Date();
    const day = d.getDay(); // 1 is Mon
    let diff = (1 - day + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    d.setHours(10, 0, 0, 0);
    setDueDate(formatDateTimeLocal(d));
  };

  const setEndOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 17, 0, 0);
    setDueDate(formatDateTimeLocal(lastDay));
  };

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
        const sorted = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setUsers(sorted);
        if (sorted.length > 0) {
          const defaultUser = currentUserId
            ? sorted.find((u) => u.id === currentUserId)?.id || sorted[0].id
            : sorted[0].id;
          setAssigneeIds([defaultUser]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const toggleAssignee = (uid: string) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalAssigneeIds =
      assigneeIds.length > 0 ? assigneeIds : currentUserId ? [currentUserId] : [];

    if (!title.trim() || finalAssigneeIds.length === 0) {
      setError("Please provide a task title and select at least one assignee.");
      return;
    }

    // Client-side seniority check for employees
    if (isEmployee) {
      const currentEmployee = users.find((u) => u.id === currentUserId);
      const currentOrder = currentEmployee?.order ?? 0;
      for (const uid of finalAssigneeIds) {
        if (uid !== currentUserId) {
          const targetUser = users.find((u) => u.id === uid);
          const targetOrder = targetUser?.order ?? 0;
          if (targetUser && (targetUser.role !== "EMPLOYEE" || targetOrder <= currentOrder)) {
            setError(
              `Cannot assign tasks to senior members (${targetUser.name}). You can only assign tasks to junior colleagues or yourself.`
            );
            return;
          }
        }
      }
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
          assigneeIds: finalAssigneeIds,
          assigneeId: finalAssigneeIds[0],
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {isEmployee ? "Create Self Task" : "Create New Task"}
              </h3>
              <p className="text-xs text-slate-400">Add a new task item with deadlines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare monthly analytics report"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details, requirements, or progress notes..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all resize-none"
            />
          </div>

          {/* Multi-Assignee Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <label className="text-xs font-semibold text-slate-200">
                  Assignees *
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {assigneeIds.length} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!assigneeIds.includes(currentUserId)) {
                        setAssigneeIds((prev) => [...prev, currentUserId]);
                      }
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
                  >
                    + Assign Myself
                  </button>
                )}
                {assigneeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssigneeIds([])}
                    className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected Chips */}
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                {assigneeIds.map((uid) => {
                  const u = users.find((user) => user.id === uid);
                  if (!u) return null;
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg text-[11px] font-medium bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 shadow-sm animate-fadeIn"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                        {u.name[0]?.toUpperCase()}
                      </span>
                      <span>{u.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        className="hover:text-rose-300 p-0.5 rounded-full hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search & Team member multi-select checklist */}
            <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
              <div className="p-2 border-b border-slate-800/80 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="Search team members by name or department..."
                  className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none"
                />
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/50 p-1">
                {users
                  .filter((u) =>
                    !assigneeSearch.trim() ||
                    u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                    u.department?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                    u.role.toLowerCase().includes(assigneeSearch.toLowerCase())
                  )
                  .map((u) => {
                    const isSelected = assigneeIds.includes(u.id);
                    const isCurrent = u.id === currentUserId;
                    const currentEmployee = users.find((cur) => cur.id === currentUserId);
                    const currentOrder = currentEmployee?.order ?? 0;
                    const uOrder = u.order ?? 0;
                    const isSenior = isEmployee && !isCurrent && (u.role !== "EMPLOYEE" || uOrder <= currentOrder);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={isSenior}
                        onClick={() => toggleAssignee(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                          isSenior
                            ? "opacity-40 cursor-not-allowed bg-slate-950"
                            : isSelected
                            ? "bg-indigo-600/15 text-white hover:bg-indigo-600/25"
                            : "hover:bg-slate-900 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] text-indigo-400 font-mono">(You)</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {u.department || "General"} • {u.role}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isSenior ? (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Senior</span>
                            </span>
                          ) : (
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-500 text-white"
                                  : "border-slate-700 bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {isEmployee && (
              <p className="text-[11px] text-slate-400 mt-1">
                💡 Employees can assign tasks to junior team members or themselves based on company seniority order.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-mono"
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED")}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-mono"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Due Date & Time
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="relative flex items-center cursor-pointer group custom-picker-container"
              >
                <input
                  ref={dateInputRef}
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 group-hover:border-slate-700 focus:border-indigo-500 rounded-xl pl-3.5 pr-26 py-2.5 text-xs text-white outline-none transition-all font-mono cursor-pointer hide-native-picker"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dateInputRef.current?.showPicker?.();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none"
                  title="Open Calendar"
                  aria-label="Open Calendar"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Calendar</span>
                </button>
              </div>

              {/* Quick Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
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
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition-colors cursor-pointer"
                    title="Clear selected deadline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-transparent transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
