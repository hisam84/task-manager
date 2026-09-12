import { NextResponse } from "next/server";
import { canAccessTask, canDeleteTask, getCurrentUser, isManagerOrAdmin, canAssignTaskToUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError, TASK_LIST_SELECT } from "@/lib/http";
import { sendTaskCreatedEmail, sendTaskCompletedEmail, sendTaskCancelledEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity-log";
import type { Prisma } from "@prisma/client";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const patchTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().min(1).optional().nullable(),
  assigneeIds: z.array(z.string()).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  rescheduleReason: z.string().max(1000).optional().nullable(),
  notifyCreatorOnComplete: z.boolean().optional(),
  completionNote: z.string().max(1000).optional().nullable(),
  cancelReason: z.string().max(1000).optional().nullable(),
  notifyOnCancel: z.boolean().optional(),
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
          select: { id: true, name: true, email: true, role: true, department: true, avatar: true },
        },
        assignees: {
          select: {
            user: {
              select: { id: true, name: true, email: true, role: true, department: true, avatar: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        company: {
          select: { id: true, name: true, slug: true, notifyAssignerOnTaskComplete: true, taskCompletionNotifyMode: true },
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
        status: true,
        assignees: { select: { userId: true } },
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

      if (data.status === "CANCELLED" && existingTask.status !== "CANCELLED") {
        const reasonText = data.cancelReason?.trim();
        await prisma.comment.create({
          data: {
            taskId: id,
            authorId: user.id,
            body: `🚫 [Task Cancelled] Task was marked as Cancelled by ${user.name || "User"}.${reasonText ? `\nReason: ${reasonText}` : ""}`,
          },
        });
      } else if (existingTask.status === "CANCELLED" && data.status !== "CANCELLED") {
        await prisma.comment.create({
          data: {
            taskId: id,
            authorId: user.id,
            body: `🔄 [Task Reopened] Task was reopened by ${user.name || "User"} (Status changed to ${data.status}).`,
          },
        });
      }
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
      if (newDueDate && newDueDate.getTime() > Date.now()) {
        updateData.overdueNotifiedAt = null;
        updateData.dueReminderNotifiedAt = null;
      }

      const formatDT = (d: Date | null | undefined) =>
        d
          ? new Date(d).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "None";

      const oldDateStr = existingTask.dueDate ? formatDT(existingTask.dueDate) : "None";
      const newDateStr = newDueDate ? formatDT(newDueDate) : "Cleared";

      if (oldDateStr !== newDateStr) {
        const reasonText = data.rescheduleReason?.trim() || "No reason specified";
        await prisma.comment.create({
          data: {
            taskId: id,
            authorId: user.id,
            body: `📅 [Task Rescheduled] Deadline changed from ${oldDateStr} to ${newDateStr}.\nReason: ${reasonText}`,
          },
        });
      }
    }

    let newlyAssignedUsers: { name: string; email: string }[] = [];

    if (Array.isArray(data.assigneeIds)) {
      if (!manager && existingTask.creatorId !== user.id) {
        return jsonError("Forbidden: Only managers or the task creator can reassign this task", 403);
      }

      const targetIds = Array.from(
        new Set(
          data.assigneeIds.filter(
            (uid): uid is string => typeof uid === "string" && uid.trim().length > 0
          )
        )
      );

      const finalIds = targetIds.length > 0 ? targetIds : [existingTask.assigneeId || user.id];

      const targetUsers = await prisma.user.findMany({
        where: { id: { in: finalIds } },
        select: { id: true, name: true, email: true, role: true, order: true, companyId: true },
      });

      if (targetUsers.length !== finalIds.length) {
        return jsonError("One or more assignees not found", 400);
      }

      for (const tUser of targetUsers) {
        if (user.role !== "SUPER_ADMIN" && tUser.companyId !== existingTask.companyId) {
          return jsonError(`Assignee ${tUser.name} must belong to the same company`, 403);
        }
        const assignmentCheck = canAssignTaskToUser(user, tUser);
        if (!assignmentCheck.allowed) {
          return jsonError(assignmentCheck.reason || `Assignment to ${tUser.name} forbidden`, 403);
        }
      }

      const existingUserIds = existingTask.assignees?.map((a) => a.userId) || [existingTask.assigneeId];
      const newlyAdded = targetUsers.filter((u) => !existingUserIds.includes(u.id));
      newlyAssignedUsers = newlyAdded.map((u) => ({ name: u.name, email: u.email }));

      await prisma.taskAssignee.deleteMany({
        where: {
          taskId: id,
          userId: { notIn: finalIds },
        },
      });

      for (const uid of finalIds) {
        await prisma.taskAssignee.upsert({
          where: { taskId_userId: { taskId: id, userId: uid } },
          create: { taskId: id, userId: uid },
          update: {},
        });
      }

      updateData.assignee = { connect: { id: finalIds[0] } };
    } else if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      if (!manager && existingTask.creatorId !== user.id) {
        return jsonError("Forbidden: Only managers or the task creator can reassign this task", 403);
      }

      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true, name: true, email: true, role: true, order: true, companyId: true },
      });
      if (!assignee) {
        return jsonError("Assignee not found", 400);
      }
      if (user.role !== "SUPER_ADMIN" && assignee.companyId !== existingTask.companyId) {
        return jsonError("Assignee must belong to the same company", 403);
      }

      const assignmentCheck = canAssignTaskToUser(user, assignee);
      if (!assignmentCheck.allowed) {
        return jsonError(assignmentCheck.reason || "Assignment forbidden", 403);
      }

      updateData.assignee = { connect: { id: data.assigneeId } };
      newlyAssignedUsers = [{ name: assignee.name, email: assignee.email }];

      await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
      await prisma.taskAssignee.create({
        data: { taskId: id, userId: data.assigneeId },
      });
    } else if (manager && data.assigneeId) {
      updateData.assignee = { connect: { id: data.assigneeId } };
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      select: TASK_LIST_SELECT,
    });

    if (newlyAssignedUsers.length > 0) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://taskmanager-iit.vercel.app/";
      const taskUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;

      for (const newlyAssignedUser of newlyAssignedUsers) {
        if (newlyAssignedUser.email) {
          try {
            await sendTaskCreatedEmail({
              to: newlyAssignedUser.email,
              assigneeName: newlyAssignedUser.name || "Team Member",
              taskTitle: updatedTask.title,
              taskDescription: updatedTask.description,
              priority: updatedTask.priority,
              status: updatedTask.status,
              dueDate: updatedTask.dueDate,
              creatorName: user.name || "Manager",
              companyName: user.companyName,
              taskUrl,
            });
          } catch (err) {
            console.error("Failed to send task reassignment notification email:", err);
          }
        }
      }
    }

    const canNotifyCreator = (updatedTask.company as any)?.notifyAssignerOnTaskComplete !== false;
    const isManualMode = (updatedTask.company as any)?.taskCompletionNotifyMode === "MANUAL";
    const shouldNotify =
      canNotifyCreator &&
      Boolean(updatedTask.creator?.email) &&
      (isManualMode
        ? data.notifyCreatorOnComplete === true
        : data.notifyCreatorOnComplete !== false && existingTask.status !== "DONE");

    if (updatedTask.status === "DONE" && shouldNotify) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://taskmanager-iit.vercel.app/";
      const taskUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;
      const noteText = data.completionNote?.trim() || null;

      try {
        await sendTaskCompletedEmail({
          to: updatedTask.creator.email,
          creatorName: updatedTask.creator.name || "Manager",
          assigneeName: user.name || updatedTask.assignee?.name || "Employee",
          taskTitle: updatedTask.title,
          taskDescription: updatedTask.description,
          priority: updatedTask.priority,
          completedAt: new Date(),
          completionNote: noteText,
          companyName: user.companyName || updatedTask.company?.name,
          taskUrl,
        });

        await prisma.comment.create({
          data: {
            taskId: id,
            authorId: user.id,
            body: `✅ [Task Completed & Notified] ${user.name} sent completion notification email to ${updatedTask.creator.name} (${updatedTask.creator.email}).${noteText ? `\nNote: ${noteText}` : ""}`,
          },
        });
      } catch (err) {
        console.error("Failed to send task completion notification email:", err);
      }
    }

    if (updatedTask.status === "CANCELLED" && existingTask.status !== "CANCELLED" && data.notifyOnCancel) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://taskmanager-iit.vercel.app/";
      const taskUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;
      const reasonText = data.cancelReason?.trim() || null;

      // Determine recipient: if canceller is creator, notify assignee; otherwise notify creator
      const recipient = user.id === updatedTask.creatorId ? updatedTask.assignee : updatedTask.creator;

      if (recipient?.email) {
        try {
          await sendTaskCancelledEmail({
            to: recipient.email,
            recipientName: recipient.name || "Team Member",
            cancellerName: user.name || "Team Member",
            taskTitle: updatedTask.title,
            taskDescription: updatedTask.description,
            priority: updatedTask.priority,
            cancelledAt: new Date(),
            cancelReason: reasonText,
            companyName: user.companyName || updatedTask.company?.name,
            taskUrl,
          });

          await prisma.comment.create({
            data: {
              taskId: id,
              authorId: user.id,
              body: `📧 [Cancellation Notified] ${user.name} sent cancellation notification email to ${recipient.name} (${recipient.email}).`,
            },
          });
        } catch (err) {
          console.error("Failed to send task cancellation notification email:", err);
        }
      }
    }

    // Record Activity Log
    const isStatusChange = updatedTask.status !== existingTask.status;
    await logActivity({
      companyId: user.companyId || updatedTask.companyId,
      userId: user.id,
      action: isStatusChange ? "TASK_STATUS_CHANGED" : "TASK_UPDATED",
      entityType: "TASK",
      entityId: id,
      description: isStatusChange
        ? `${user.name} changed status of "${updatedTask.title}" from ${existingTask.status} to ${updatedTask.status}`
        : `${user.name} updated task "${updatedTask.title}"`,
      details: {
        fromStatus: existingTask.status,
        toStatus: updatedTask.status,
        priority: updatedTask.priority,
        assigneeName: updatedTask.assignee?.name,
      },
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
    if (!user || user.role === "EMPLOYEE" || !canDeleteTask(user.role)) {
      return jsonError("Regular employees cannot delete tasks. Only Admin or Manager can delete tasks.", 403);
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, title: true, companyId: true, assigneeId: true },
    });

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, task)) {
      return jsonError("Forbidden", 403);
    }

    await prisma.task.delete({ where: { id } });

    await logActivity({
      companyId: task.companyId,
      userId: user.id,
      action: "TASK_DELETED",
      entityType: "TASK",
      entityId: id,
      description: `${user.name} deleted task "${task.title}"`,
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, "Failed to delete task");
  }
}
