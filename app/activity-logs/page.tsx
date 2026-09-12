"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import {
  History,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  PlusCircle,
  ListTodo,
  Trash2,
  UserPlus,
  Users,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  Ban,
  Activity,
  User,
  ArrowUpDown,
  FileText,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    designation?: string | null;
  } | null;
}

const ENTITY_FILTERS = [
  { label: "All Activities", value: "ALL" },
  { label: "Tasks", value: "TASK" },
  { label: "Leaves", value: "LEAVE" },
  { label: "Attendance", value: "ATTENDANCE" },
  { label: "Team & Users", value: "USER" },
  { label: "Departments", value: "DEPARTMENT" },
];

export default function ActivityLogsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [metrics, setMetrics] = useState<{
    todayCount: number;
    taskCount: number;
    leaveCount: number;
    attendanceCount: number;
    userCount: number;
    totalCount: number;
  }>({
    todayCount: 0,
    taskCount: 0,
    leaveCount: 0,
    attendanceCount: 0,
    userCount: 0,
    totalCount: 0,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityType, setEntityType] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch session
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === "EMPLOYEE") {
            router.replace("/");
          }
        } else {
          router.replace("/");
        }
      } catch (err) {
        console.error("Session error:", err);
        router.replace("/");
      } finally {
        setLoadingUser(false);
      }
    }
    loadSession();
  }, [router]);

  // Fetch team members for user dropdown filter
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setUsersList(data);
          }
        }
      } catch (err) {
        console.error("Failed to load users for filter:", err);
      }
    }
    if (currentUser && currentUser.role !== "EMPLOYEE") {
      loadUsers();
    }
  }, [currentUser]);

  // Fetch Activity Logs
  const fetchLogs = useCallback(
    async (pageToLoad: number = 1) => {
      try {
        setLoadingLogs(true);
        const params = new URLSearchParams();
        params.set("page", String(pageToLoad));
        params.set("limit", String(pagination.limit));

        if (entityType && entityType !== "ALL") params.set("entityType", entityType);
        if (selectedUserId && selectedUserId !== "ALL") params.set("userId", selectedUserId);
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/activity-logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
          if (data.pagination) {
            setPagination(data.pagination);
          }
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        }
      } catch (err) {
        console.error("Failed to load activity logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    },
    [entityType, selectedUserId, debouncedSearch, startDate, endDate, pagination.limit]
  );

  useEffect(() => {
    if (currentUser && currentUser.role !== "EMPLOYEE") {
      fetchLogs(pagination.page);
    }
  }, [currentUser, pagination.page, fetchLogs]);

  // Helper for action badge styling
  const getActionBadge = (action: string, entityType: string) => {
    switch (action) {
      case "TASK_CREATED":
        return {
          icon: PlusCircle,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
          label: "Task Created",
        };
      case "TASK_STATUS_CHANGED":
        return {
          icon: ListTodo,
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
          label: "Status Changed",
        };
      case "TASK_UPDATED":
        return {
          icon: FileText,
          color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
          label: "Task Updated",
        };
      case "TASK_DELETED":
        return {
          icon: Trash2,
          color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
          label: "Task Deleted",
        };
      case "LEAVE_APPLY":
        return {
          icon: Coffee,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
          label: "Leave Applied",
        };
      case "LEAVE_APPROVED":
        return {
          icon: CheckCircle2,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
          label: "Leave Approved",
        };
      case "LEAVE_REJECTED":
        return {
          icon: XCircle,
          color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
          label: "Leave Rejected",
        };
      case "LEAVE_CANCELLED":
        return {
          icon: Ban,
          color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
          label: "Leave Cancelled",
        };
      case "ATTENDANCE_CHECKIN":
        return {
          icon: Clock,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30",
          label: "Clocked IN",
        };
      case "ATTENDANCE_CHECKOUT":
        return {
          icon: Clock,
          color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
          label: "Clocked OUT",
        };
      case "USER_CREATED":
        return {
          icon: UserPlus,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
          label: "User Created",
        };
      default:
        return {
          icon: Activity,
          color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          label: action.replace(/_/g, " "),
        };
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setEntityType("ALL");
    setSelectedUserId("ALL");
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(search) ||
    entityType !== "ALL" ||
    selectedUserId !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate);

  if (loadingUser || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar user={currentUser} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                    Activity Logs & Audit Trail
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                    Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Track real-time system activities, task actions, leave decisions, attendance punches, and team changes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fetchLogs(pagination.page)}
                disabled={loadingLogs}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                title="Refresh logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin text-indigo-500" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Logs</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {metrics.totalCount}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">Today's Events</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                {metrics.todayCount}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">Task Actions</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {metrics.taskCount}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Leave Events</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {metrics.leaveCount}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 block">Attendance</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {metrics.attendanceCount}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block">User / Team</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {metrics.userCount}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              {ENTITY_FILTERS.map((f) => {
                const isActive = entityType === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      setEntityType(f.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className={`min-h-11 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Input and Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, actor..."
                  className="w-full min-h-11 pl-9 pr-3 py-2.5 text-base md:text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-slate-900 dark:text-white transition-colors"
                />
              </div>

              {/* User Selector */}
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full min-h-11 px-3 py-2.5 text-base md:text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-slate-900 dark:text-white transition-colors cursor-pointer appearance-none"
                >
                  <option value="ALL">All Team Members</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full min-h-11 px-3 py-2.5 text-base md:text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-slate-900 dark:text-white transition-colors"
                  title="Filter from start date"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="flex-1 min-h-11 min-w-0 px-3 py-2.5 text-base md:text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-slate-900 dark:text-white transition-colors"
                  title="Filter to end date"
                />

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Activity Feed Timeline */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Activity Stream ({pagination.total} total)
              </span>
              <span className="text-xs text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>

            {loadingLogs ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs">Loading activity stream...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No activity logs found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {hasActiveFilters
                    ? "Try adjusting your search or date filters to find matching records."
                    : "Activities will be recorded here in real-time as tasks, leaves, and attendance are actioned."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action, log.entityType);
                  const Icon = badge.icon;
                  const dateObj = new Date(log.createdAt);

                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  let parsedDetails: any = null;
                  if (log.details) {
                    try {
                      parsedDetails = JSON.parse(log.details);
                    } catch {
                      parsedDetails = log.details;
                    }
                  }

                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      {/* Left: Icon, User Avatar, Description */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Event Icon Badge */}
                        <div
                          className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.color}`}
                          title={badge.label}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Actor Info & Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {log.user?.name || "System"}
                            </span>
                            {log.user?.role && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {log.user.role}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                            {log.description}
                          </p>

                          {/* Expandable Details if present */}
                          {parsedDetails && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="min-h-11 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide Details" : "View Details / Metadata"}</span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                                  {typeof parsedDetails === "object" ? (
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(parsedDetails, null, 2)}
                                    </pre>
                                  ) : (
                                    <p>{String(parsedDetails)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          {formattedTime}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
                </span>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {pagination.page} / {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
