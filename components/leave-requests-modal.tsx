"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Coffee,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Ban,
  MessageSquare,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface LeaveRequestItem {
  id: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    designation?: string | null;
    department?: string | null;
    departmentRel?: { name?: string } | null;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface LeaveRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
  onOpenApplyLeave?: () => void;
  onLeaveDecided?: () => void;
}

interface DecisionDialogState {
  item: LeaveRequestItem;
  action: "APPROVED" | "REJECTED" | "CANCELLED";
}

export function LeaveRequestsModal({
  isOpen,
  onClose,
  currentUser,
  onOpenApplyLeave,
  onLeaveDecided,
}: LeaveRequestsModalProps) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for Decision & Notes Modal
  const [decisionTarget, setDecisionTarget] = useState<DecisionDialogState | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const isEmployee = currentUser.role === "EMPLOYEE";
  const isManagerOrAdmin = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUser.role);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leave applications.");
      if (Array.isArray(data)) setRequests(data);
    } catch (err: any) {
      setError(err.message || "Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLeaveRequests();
    }
  }, [isOpen, fetchLeaveRequests]);

  if (!isOpen) return null;

  const handleDecision = async (
    id: string,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
    customNote?: string
  ) => {
    try {
      setActionLoadingId(id);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes: customNote?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update leave status.");

      setSuccess(
        status === "APPROVED"
          ? "Leave application approved! The dates have been recorded in the attendance sheet."
          : status === "CANCELLED"
          ? "Leave application has been cancelled."
          : "Leave application has been rejected."
      );

      const noteToSave = customNote?.trim() || (status === "APPROVED" ? "Approved" : undefined);

      // Update state locally
      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                reviewNotes: noteToSave !== undefined ? noteToSave : item.reviewNotes,
                reviewedAt: new Date().toISOString(),
                reviewer: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
              }
            : item
        )
      );

      if (onLeaveDecided) {
        onLeaveDecided();
      }

      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to process decision.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-3xl max-h-[88vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEmployee ? "My Leave Applications" : "Leave Management & Requests"}
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEmployee
                  ? "Track your submitted leave requests and approval status"
                  : "Review, approve, or reject employee leave applications"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEmployee && onOpenApplyLeave && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApplyLeave();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply Leave</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchLeaveRequests}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-xs">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map((tab) => {
              const isActive = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {tab === "ALL"
                    ? "All Requests"
                    : tab === "PENDING"
                    ? `Pending (${requests.filter((r) => r.status === "PENDING").length})`
                    : tab === "APPROVED"
                    ? "Approved"
                    : tab === "REJECTED"
                    ? "Rejected"
                    : "Cancelled"}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Total: {filteredRequests.length}
          </span>
        </div>

        {/* Feedback Message */}
        {error && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <span className="text-xs">Loading leave applications...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Coffee className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No leave requests found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {filter === "ALL"
                  ? "No leave applications have been submitted yet."
                  : `There are no requests with ${filter.toLowerCase()} status.`}
              </p>
            </div>
          ) : (
            filteredRequests.map((item) => {
              const startFormatted = new Date(item.startDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });
              const endFormatted = new Date(item.endDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });

              const isPending = item.status === "PENDING";
              const isApproved = item.status === "APPROVED";
              const isRejected = item.status === "REJECTED";
              const isCancelled = item.status === "CANCELLED";
              const isOwner = item.user?.id === currentUser.id;
              const isProcessing = actionLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? "bg-amber-50/20 dark:bg-slate-950/60 border-amber-200 dark:border-amber-900/40"
                      : isApproved
                      ? "bg-emerald-50/10 dark:bg-slate-950/40 border-emerald-200 dark:border-emerald-900/40"
                      : isCancelled
                      ? "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-80"
                      : "bg-slate-50/40 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Applicant info & Leave dates */}
                    <div className="flex items-start gap-3 min-w-0">
                      {item.user?.avatar ? (
                        <img
                          src={item.user.avatar}
                          alt={item.user.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-200 dark:border-slate-700 shrink-0">
                          {item.user?.name ? item.user.name.slice(0, 2).toUpperCase() : "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.user?.name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {item.leaveType}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.user?.designation && <span>{item.user.designation}</span>}
                          {item.user?.departmentRel?.name && (
                            <span>Dept: {item.user.departmentRel.name}</span>
                          )}
                        </div>

                        {/* Leave period */}
                        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {startFormatted} &mdash; {endFormatted}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
                            {item.daysCount} Day{item.daysCount > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Reason */}
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                          <span className="font-semibold text-slate-700 dark:text-slate-400">Reason:</span>{" "}
                          {item.reason}
                        </p>

                        {/* Reviewer Note / Decision Note if reviewed */}
                        {item.reviewNotes && (
                          <div
                            className={`mt-2 text-xs p-2.5 rounded-xl border leading-relaxed ${
                              item.status === "APPROVED"
                                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                                : item.status === "REJECTED"
                                ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200"
                                : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span className="font-bold">
                              {item.status === "APPROVED"
                                ? "Approval Note:"
                                : item.status === "REJECTED"
                                ? "Rejection Note:"
                                : "Cancellation Note:"}
                            </span>{" "}
                            <span>{item.reviewNotes}</span>
                          </div>
                        )}

                        {/* Reviewer Meta if reviewed */}
                        {item.reviewedAt && (
                          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              Reviewed by <strong>{item.reviewer?.name || "Manager"}</strong> on{" "}
                              {new Date(item.reviewedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status badge & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                            : isRejected
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30"
                            : isCancelled
                            ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600/40"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isRejected ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : isCancelled ? (
                          <Ban className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>{item.status}</span>
                      </span>

                      {/* Action Buttons for Pending */}
                      {isPending && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap sm:justify-end">
                          {isManagerOrAdmin ? (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  setDecisionTarget({ item, action: "APPROVED" });
                                  setDecisionNote("Approved");
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                                title="Approve leave application with note"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  setDecisionTarget({ item, action: "REJECTED" });
                                  setDecisionNote("");
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                                title="Reject leave application with note"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  setDecisionTarget({ item, action: "CANCELLED" });
                                  setDecisionNote("");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                                title="Cancel leave application"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </>
                          ) : isOwner ? (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setDecisionTarget({ item, action: "CANCELLED" });
                                setDecisionNote("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer disabled:opacity-50"
                              title="Cancel your pending leave application"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                              <span>Cancel Request</span>
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Cancel Action for Approved Leaves (applicant or manager) */}
                      {isApproved && (isOwner || isManagerOrAdmin) && (
                        <div className="mt-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setDecisionTarget({ item, action: "CANCELLED" });
                              setDecisionNote("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-800 text-slate-500 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-50"
                            title="Cancel this approved leave and revert attendance records"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            <span>Cancel Leave</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Decision & Note Modal Dialog */}
        {decisionTarget && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
            onClick={() => {
              setDecisionTarget(null);
              setDecisionNote("");
            }}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-slate-900 dark:text-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl border ${
                      decisionTarget.action === "APPROVED"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : decisionTarget.action === "REJECTED"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {decisionTarget.action === "APPROVED" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : decisionTarget.action === "REJECTED" ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Ban className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {decisionTarget.action === "APPROVED"
                        ? "Approve Leave Application"
                        : decisionTarget.action === "REJECTED"
                        ? "Reject Leave Application"
                        : "Cancel Leave Application"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {decisionTarget.action === "APPROVED"
                        ? "Confirm approval and provide an optional note for the employee."
                        : decisionTarget.action === "REJECTED"
                        ? "Please provide a reason/note to inform the employee."
                        : "Confirm cancellation of this leave request."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDecisionTarget(null);
                    setDecisionNote("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Leave Application Summary */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Applicant:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {decisionTarget.item.user?.name} ({decisionTarget.item.leaveType})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Leave Dates:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(decisionTarget.item.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}{" "}
                    &mdash;{" "}
                    {new Date(decisionTarget.item.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}{" "}
                    ({decisionTarget.item.daysCount} Day{decisionTarget.item.daysCount > 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Reason:</span>
                  <span className="text-slate-700 dark:text-slate-300 italic text-right line-clamp-2">
                    "{decisionTarget.item.reason}"
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Quick Note Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(decisionTarget.action === "APPROVED"
                    ? [
                        "Approved",
                        "Approved with pay",
                        "Approved - Please handover pending tasks",
                      ]
                    : decisionTarget.action === "REJECTED"
                    ? [
                        "Urgent project deadline",
                        "Insufficient leave balance",
                        "Key team members already on leave",
                        "Please discuss with manager first",
                      ]
                    : [
                        "Cancelled upon request",
                        "Plans changed",
                        "Shift rescheduled",
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDecisionNote(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        decisionNote === preset
                          ? decisionTarget.action === "APPROVED"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : decisionTarget.action === "REJECTED"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-slate-800 text-white border-slate-800 dark:bg-slate-700"
                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {decisionTarget.action === "APPROVED"
                    ? "Approval Note (Optional)"
                    : decisionTarget.action === "REJECTED"
                    ? "Rejection Reason (Recommended)"
                    : "Cancellation Reason (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={
                    decisionTarget.action === "APPROVED"
                      ? "e.g. Approved. Enjoy your time off!"
                      : decisionTarget.action === "REJECTED"
                      ? "e.g. Due to an upcoming client release, please reschedule your leave."
                      : "e.g. Request cancelled upon mutual agreement."
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-colors resize-none shadow-xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={Boolean(actionLoadingId)}
                  onClick={() => {
                    setDecisionTarget(null);
                    setDecisionNote("");
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  disabled={Boolean(actionLoadingId)}
                  onClick={async () => {
                    await handleDecision(
                      decisionTarget.item.id,
                      decisionTarget.action,
                      decisionNote
                    );
                    setDecisionTarget(null);
                    setDecisionNote("");
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    decisionTarget.action === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : decisionTarget.action === "REJECTED"
                      ? "bg-rose-600 hover:bg-rose-500"
                      : "bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  {actionLoadingId === decisionTarget.item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : decisionTarget.action === "APPROVED" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : decisionTarget.action === "REJECTED" ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Confirm{" "}
                    {decisionTarget.action === "APPROVED"
                      ? "Approval"
                      : decisionTarget.action === "REJECTED"
                      ? "Rejection"
                      : "Cancellation"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
