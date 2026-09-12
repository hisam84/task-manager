"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, X, Mail, Send, Loader2, MessageSquare } from "lucide-react";

export interface TaskCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    creator?: { name?: string | null; email?: string | null } | null;
  } | null;
  onConfirm: (options: {
    notifyCreatorOnComplete: boolean;
    completionNote?: string;
  }) => Promise<void> | void;
}

export function TaskCompleteModal({
  isOpen,
  onClose,
  task,
  onConfirm,
}: TaskCompleteModalProps) {
  const [notifyCreator, setNotifyCreator] = useState(true);
  const [completionNote, setCompletionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifyCreator(Boolean(task?.creator?.email));
      setCompletionNote("");
      setSubmitting(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirm({
        notifyCreatorOnComplete: notifyCreator && Boolean(task.creator?.email),
        completionNote: completionNote.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Failed to complete task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const creatorName = task.creator?.name || "Task Assigner";
  const creatorEmail = task.creator?.email;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Complete Task
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mark task as completed and notify the assigner
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1.5">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
            {task.title}
          </div>
          {creatorName && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned by:</span>
              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                {creatorName}
              </strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notification Email Toggle */}
          {creatorEmail ? (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Email Completion Notice to Assigner
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Send an automatic notification email to <strong>{creatorEmail}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifyCreator(!notifyCreator)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifyCreator ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    notifyCreator ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Assigner does not have a registered email address. Task will be marked as Completed without sending an email.
            </div>
          )}

          {/* Optional Completion Note */}
          {notifyCreator && creatorEmail && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Completion Note (Optional)
              </label>
              <textarea
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Add any remarks, link to deliverables, or handover note..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {submitting
                  ? "Completing..."
                  : notifyCreator && creatorEmail
                  ? "Complete & Send Email"
                  : "Mark as Done"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskCompleteModal;
