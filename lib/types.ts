export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  avatar?: string | null;
  designation?: string | null;
  department?: string | null;
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companySlug?: string | null;
  order?: number;
}

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
