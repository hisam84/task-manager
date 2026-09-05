import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { effectiveTaskStatus, isOverdue, normalizeStoredStatus } from "@/lib/domain";

export function apiError(error: unknown, fallback: string, status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const isProd = process.env.NODE_ENV === "production";
  const message =
    !isProd && error instanceof Error && error.message ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export const TASK_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  progress: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  isSelfTask: true,
  adminComment: true,
  employeeComment: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
  departmentId: true,
  assigneeId: true,
  creatorId: true,
  department: { select: { id: true, name: true } },
  assignee: {
    select: { id: true, name: true, email: true, departmentId: true },
  },
  creator: {
    select: { id: true, name: true, email: true, role: true },
  },
  company: {
    select: { id: true, name: true, slug: true },
  },
  _count: {
    select: { comments: true, activities: true },
  },
} as const;

export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  phone: true,
  employeeCode: true,
  designation: true,
  isActive: true,
  joiningDate: true,
  createdAt: true,
  companyId: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
} as const;

export function serializeTask<T extends {
  status: string;
  dueDate: Date | string | null;
}>(task: T) {
  const storedStatus = normalizeStoredStatus(task.status);
  return {
    ...task,
    status: storedStatus,
    effectiveStatus: effectiveTaskStatus(task),
    isOverdue: isOverdue(task),
  };
}
