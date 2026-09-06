import { NextResponse } from "next/server";
import { canAccessTask, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const createCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, companyId: true, assigneeId: true },
    });

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, task)) {
      return jsonError("Forbidden", 403);
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true, department: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(comments);
  } catch (error) {
    return apiError(error, "Failed to fetch comments");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const data = createCommentSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, companyId: true, assigneeId: true },
    });

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, task)) {
      return jsonError("Forbidden", 403);
    }

    const comment = await prisma.comment.create({
      data: {
        body: data.body,
        taskId,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true, department: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to add comment");
  }
}
