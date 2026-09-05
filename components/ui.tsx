"use client";

import { cn } from "@/lib/cn";
import { priorityLabel, statusLabel } from "@/lib/domain";
import { X } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const styles: Record<string, string> = {
    pending: "bg-white/5 text-[#888888] border-[#222222]",
    todo: "bg-white/5 text-[#888888] border-[#222222]",
    in_progress: "bg-blue-500/10 text-[#0070f3] border-blue-500/30",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    overdue: "bg-red-500/10 text-red-400 border-red-500/30",
    cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border", styles[key] ?? styles.pending)}>
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const key = priority.toLowerCase();
  const styles: Record<string, string> = {
    low: "text-[#888888] border-[#222222]",
    medium: "text-[#50e3c2] border-teal-500/30",
    high: "text-[#f5a623] border-amber-500/30",
    urgent: "text-[#ff0080] border-pink-500/40",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border", styles[key] ?? styles.medium)}>
      {priorityLabel(priority)}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] px-6 py-12 text-center">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-[#888888]">{description}</p>
    </div>
  );
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-[#222222] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#1f1f1f]">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {description ? <p className="mt-1 text-xs text-[#888888]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#777777] hover:text-white hover:bg-[#1a1a1a] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wide text-[#888888]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#0070f3] transition-colors";

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-2 text-xs font-medium text-white hover:bg-[#0060d0] disabled:opacity-50 cursor-pointer transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#222222] bg-transparent px-3 py-2 text-xs font-medium text-[#cccccc] hover:border-[#333333] hover:text-white disabled:opacity-50 cursor-pointer transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-4 hover:border-[#333333] transition-colors">
      <p className="text-[11px] uppercase tracking-wide text-[#888888]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#666666]">{hint}</p> : null}
    </div>
  );
}

export function BarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-[11px] text-[#888888]">
            <span>{item.label}</span>
            <span className="text-white">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-[#151515]">
            <div
              className="h-2 rounded-full bg-[#0070f3] transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-[#666666]">No data yet</p> : null}
    </div>
  );
}
