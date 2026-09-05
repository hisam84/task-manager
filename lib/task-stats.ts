import { completionRate, effectiveTaskStatus, normalizeStoredStatus } from "@/lib/domain";

export interface TaskStatRow {
  status: string;
  dueDate: Date | string | null;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export function summarizeTasks(tasks: TaskStatRow[]) {
  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let overdue = 0;

  for (const task of tasks) {
    const effective = effectiveTaskStatus(task);
    if (effective === "OVERDUE") overdue += 1;
    const stored = normalizeStoredStatus(task.status);
    if (stored === "PENDING") pending += 1;
    else if (stored === "IN_PROGRESS") inProgress += 1;
    else if (stored === "COMPLETED") completed += 1;
    else if (stored === "CANCELLED") cancelled += 1;
  }

  const total = tasks.length;
  const completionMs: number[] = [];
  for (const task of tasks) {
    if (normalizeStoredStatus(task.status) !== "COMPLETED") continue;
    if (!task.completedAt || !task.createdAt) continue;
    const created = new Date(task.createdAt).getTime();
    const done = new Date(task.completedAt).getTime();
    if (Number.isFinite(created) && Number.isFinite(done) && done >= created) {
      completionMs.push(done - created);
    }
  }
  const avgCompletionHours =
    completionMs.length === 0
      ? null
      : Math.round((completionMs.reduce((a, b) => a + b, 0) / completionMs.length / 36e5) * 10) / 10;

  return {
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    overdue,
    completionRate: completionRate(completed, total),
    avgCompletionHours,
  };
}
