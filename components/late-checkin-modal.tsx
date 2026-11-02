"use client";

import React, { useState } from "react";
import { AlertTriangle, Clock, X, Loader2, CheckCircle2 } from "lucide-react";

interface LateCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { lateReason: string; lateInformed: boolean }) => Promise<void>;
  lateMinutes: number;
  shiftStartTime: string;
  currentTimeStr: string;
}

export function LateCheckInModal({
  isOpen,
  onClose,
  onConfirm,
  lateMinutes,
  shiftStartTime,
  currentTimeStr,
}: LateCheckInModalProps) {
  const [lateReason, setLateReason] = useState("");
  const [lateInformed, setLateInformed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm({
        lateReason: lateReason.trim(),
        lateInformed,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit clock in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Late Arrival Check-In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are clocking in after the scheduled shift start
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Shift Start: <strong className="font-mono">{shiftStartTime}</strong> • Current Time:{" "}
              <strong className="font-mono">{currentTimeStr}</strong>
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 text-[11px] font-mono">
            {lateMinutes}m Late
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Late Arrival (লেটের কারণ)
            </label>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="e.g. Heavy traffic, vehicle breakdown, emergency, medical checkup..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Late Informed Checkbox */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lateInformed}
                onChange={(e) => setLateInformed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  I pre-informed management (আমি আগে ইনফর্ম করেছি)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  If pre-informed, late arrival penalty will be waived (0 TK fine).
                </p>
              </div>
            </label>
            {lateInformed && (
              <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Penalty will be waived (0 TK) for this check-in</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Clock In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

