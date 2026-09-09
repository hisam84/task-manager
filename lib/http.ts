import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown, fallback: string, status = 500) {
  console.error("[API_ERROR]", error);
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const message = error instanceof Error && error.message ? error.message : fallback;
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
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
  assigneeId: true,
  creatorId: true,
  assignee: {
    select: { id: true, name: true, email: true, avatar: true, designation: true, department: true },
  },
  creator: {
    select: { id: true, name: true, email: true, role: true, avatar: true, designation: true },
  },
  company: {
    select: { id: true, name: true, slug: true },
  },
  _count: {
    select: { comments: true },
  },
} as const;

export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  avatar: true,
  designation: true,
  department: true,
  createdAt: true,
  companyId: true,
  order: true,
} as const;
