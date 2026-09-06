import { NextResponse } from "next/server";
import { canAccessTask, getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError, TASK_LIST_SELECT } from "@/lib/http";
import type { Prisma } from "@prisma/client";

const patchTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  rescheduleReason: z.string().max(1000).optional().nullable(),
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
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, task)) {
      return jsonError("Forbidden", 403);
    }

    return NextResponse.json(task);
  } catch (error) {
    return apiError(error, "Failed to fetch task detail");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { id } = await params;
    const body = await req.json();
    const data = patchTaskSchema.parse(body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        assigneeId: true,
        creatorId: true,
        dueDate: true,
        title: true,
      },
    });

    if (!existingTask) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, existingTask)) {
      return jsonError("Forbidden", 403);
    }

    const manager = isManagerOrAdmin(user.role);
    const updateData: Prisma.TaskUpdateInput = {};

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.title) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.priority) {
      updateData.priority = data.priority;
    }

    if (data.dueDate !== undefined) {
      const newDueDate = data.dueDate ? new Date(data.dueDate) : null;
      updateData.dueDate = newDueDate;

      const oldDateStr = existingTask.dueDate
        ? new Date(existingTask.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "None";
      const newDateStr = newDueDate
        ? newDueDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Cleared";

      if (oldDateStr !== newDateStr) {
        const reasonText = data.rescheduleReason?.trim() || "No reason specified";
        await prisma.comment.create({
          data: {
            taskId: id,
            authorId: user.id,
            body: `📅 [Task Rescheduled] Due date changed from ${oldDateStr} to ${newDateStr}.\nReason: ${reasonText}`,
          },
        });
      }
    }

    if (manager && data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true, companyId: true },
      });
      if (!assignee) {
        return jsonError("Assignee not found", 400);
      }
      if (user.role !== "SUPER_ADMIN" && assignee.companyId !== existingTask.companyId) {
        return jsonError("Assignee must belong to the same company", 403);
      }
      updateData.assignee = { connect: { id: data.assigneeId } };
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      select: TASK_LIST_SELECT,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    return apiError(error, "Failed to update task");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManagerOrAdmin(user.role)) {
      return jsonError("Forbidden", 403);
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

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, "Failed to delete task");
  }
}
