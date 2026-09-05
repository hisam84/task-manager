import { NextResponse } from "next/server";
import { canAccessTask, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError, serializeTask, TASK_LIST_SELECT } from "@/lib/http";
import { patchTaskSchema } from "@/lib/validations";
import {
  canAssignCompanyTasks,
  canEmployeeEditSelfTask,
  canEmployeeUpdateProgress,
  isCompanyAdmin,
  normalizeProgress,
  statusFromProgress,
} from "@/lib/domain";
import { logTaskActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true, departmentId: true },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        department: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, role: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 100,
        },
        activities: {
          include: { actor: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!task) return jsonError("Task not found", 404);
    if (!canAccessTask(user, task)) return jsonError("Forbidden", 403);

    return NextResponse.json(serializeTask(task));
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
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const body = await req.json();
    const data = patchTaskSchema.parse(body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        assigneeId: true,
        isSelfTask: true,
        status: true,
        progress: true,
      },
    });

    if (!existingTask) return jsonError("Task not found", 404);
    if (!canAccessTask(user, existingTask)) return jsonError("Forbidden", 403);

    const manager = isCompanyAdmin(user.role);
    const employeeOwns = canEmployeeUpdateProgress(user.id, existingTask);
    const employeeSelf = canEmployeeEditSelfTask(user.id, existingTask);
    const updateData: Prisma.TaskUpdateInput = {};
    const events: { action: string; detail: string }[] = [];

    if (data.progress !== undefined) {
      if (!manager && !employeeOwns) return jsonError("Forbidden", 403);
      const progress = normalizeProgress(data.progress);
      const status = statusFromProgress(progress, data.status ?? existingTask.status);
      updateData.progress = progress;
      updateData.status = status;
      if (status === "COMPLETED") updateData.completedAt = new Date();
      else updateData.completedAt = null;
      events.push({ action: "progress_updated", detail: `Progress set to ${progress}%` });
      if (status !== existingTask.status) {
        events.push({
          action: status === "COMPLETED" ? "completed" : "status_changed",
          detail: `Status changed to ${status}`,
        });
      }
    } else if (data.status) {
      if (!manager && !employeeOwns) return jsonError("Forbidden", 403);
      const status = data.status;
      updateData.status = status;
      if (status === "COMPLETED") {
        updateData.progress = 100;
        updateData.completedAt = new Date();
      } else if (status === "PENDING") {
        updateData.progress = 0;
        updateData.completedAt = null;
      } else {
        updateData.completedAt = null;
      }
      events.push({
        action: status === "COMPLETED" ? "completed" : "status_changed",
        detail: `Status changed to ${status}`,
      });
    }

    if (data.employeeComment !== undefined && (manager || employeeOwns)) {
      updateData.employeeComment = data.employeeComment;
    }

    if (manager && canAssignCompanyTasks(user.role)) {
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority) updateData.priority = data.priority;
      if (data.adminComment !== undefined) updateData.adminComment = data.adminComment;
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        events.push({ action: "deadline_changed", detail: "Deadline updated" });
      }
      if (data.startDate !== undefined) {
        updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      }
      if (data.departmentId !== undefined) {
        if (data.departmentId) {
          const dept = await prisma.department.findFirst({
            where: { id: data.departmentId, companyId: existingTask.companyId },
            select: { id: true },
          });
          if (!dept) return jsonError("Department not found", 400);
          updateData.department = { connect: { id: data.departmentId } };
        } else {
          updateData.department = { disconnect: true };
        }
      }
      if (data.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: data.assigneeId },
          select: { id: true, companyId: true },
        });
        if (!assignee || assignee.companyId !== existingTask.companyId) {
          return jsonError("Assignee must belong to the same company", 403);
        }
        updateData.assignee = { connect: { id: data.assigneeId } };
        events.push({ action: "assigned", detail: `Assigned to ${assignee.id}` });
      }
    } else if (employeeSelf) {
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority) updateData.priority = data.priority;
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      select: TASK_LIST_SELECT,
    });

    for (const event of events) {
      await logTaskActivity({
        taskId: id,
        actorId: user.id,
        action: event.action,
        detail: event.detail,
      });
    }

    return NextResponse.json(serializeTask(updatedTask));
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
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, companyId: true, assigneeId: true, isSelfTask: true, creatorId: true },
    });
    if (!task) return jsonError("Task not found", 404);
    if (!canAccessTask(user, task)) return jsonError("Forbidden", 403);

    const canDelete =
      isCompanyAdmin(user.role) ||
      (task.isSelfTask && task.assigneeId === user.id && task.creatorId === user.id);
    if (!canDelete) return jsonError("Forbidden", 403);

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, "Failed to delete task");
  }
}
