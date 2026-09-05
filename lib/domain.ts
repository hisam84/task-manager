export type AppRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type StoredTaskStatus = (typeof TASK_STATUSES)[number];
export type EffectiveTaskStatus = StoredTaskStatus | "OVERDUE";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const LEGACY_STATUS: Record<string, StoredTaskStatus> = {
  TODO: "PENDING",
  IN_REVIEW: "IN_PROGRESS",
  DONE: "COMPLETED",
};

export function normalizeStoredStatus(status: string): StoredTaskStatus {
  if ((TASK_STATUSES as readonly string[]).includes(status)) {
    return status as StoredTaskStatus;
  }
  return LEGACY_STATUS[status] ?? "PENDING";
}

export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export function isCompanyAdmin(role: string): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function isEmployee(role: string): boolean {
  return role === "EMPLOYEE";
}

export function homePathForRole(role: string): string {
  if (isSuperAdmin(role)) return "/super-admin";
  if (isCompanyAdmin(role)) return "/admin";
  return "/employee";
}

export function canManageCompanies(role: string): boolean {
  return isSuperAdmin(role);
}

export function canManageDepartments(role: string): boolean {
  return isCompanyAdmin(role);
}

export function canManageEmployees(role: string): boolean {
  return isCompanyAdmin(role);
}

export function canAssignCompanyTasks(role: string): boolean {
  return isCompanyAdmin(role);
}

export function canCreateSelfTask(role: string): boolean {
  return isEmployee(role);
}

export function isOverdue(task: { status: string; dueDate?: Date | string | null }): boolean {
  const status = normalizeStoredStatus(task.status);
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  if (!task.dueDate) return false;
  const due = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  return due.getTime() < Date.now();
}

export function effectiveTaskStatus(task: {
  status: string;
  dueDate?: Date | string | null;
}): EffectiveTaskStatus {
  const status = normalizeStoredStatus(task.status);
  if (isOverdue({ ...task, status })) return "OVERDUE";
  return status;
}

export function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function statusFromProgress(progress: number, currentStatus: string): StoredTaskStatus {
  const current = normalizeStoredStatus(currentStatus);
  if (current === "CANCELLED") return "CANCELLED";
  const value = normalizeProgress(progress);
  if (value >= 100) return "COMPLETED";
  if (value > 0) return "IN_PROGRESS";
  return "PENDING";
}

export function completionRate(completed: number, total: number): number {
  if (!total) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

export function canEmployeeUpdateProgress(
  userId: string,
  task: { assigneeId: string }
): boolean {
  return task.assigneeId === userId;
}

export function canEmployeeEditSelfTask(
  userId: string,
  task: { assigneeId: string; isSelfTask: boolean }
): boolean {
  return task.isSelfTask && task.assigneeId === userId;
}

export function canDeleteDepartment(employeeCount: number, taskCount: number): boolean {
  return employeeCount === 0 && taskCount === 0;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    OVERDUE: "Overdue",
    TODO: "Pending",
    IN_REVIEW: "In Progress",
    DONE: "Completed",
  };
  return map[status] ?? status;
}

export function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
  };
  return map[priority] ?? priority;
}

export function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN" || role === "MANAGER") return "Company Admin";
  return "Employee";
}
