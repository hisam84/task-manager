export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type EffectiveTaskStatus = TaskStatus | "OVERDUE";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  phone?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  isActive?: boolean;
  joiningDate?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companySlug?: string | null;
}

export const TASK_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
