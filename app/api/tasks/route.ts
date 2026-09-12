import { NextResponse } from "next/server";
import { getCurrentUser, isManagerOrAdmin, canAssignTaskToUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError, TASK_LIST_SELECT } from "@/lib/http";
import { sendTaskCreatedEmail } from "@/lib/mail";
import { checkAndNotifyOverdueTasks } from "@/lib/task-overdue";
import { checkAndNotifyDueReminderTasks } from "@/lib/task-due-reminder";
import { logActivity } from "@/lib/activity-log";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).default("TODO"),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

const MAX_PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assigneeParam = searchParams.get("assigneeId");
    const companyParam = searchParams.get("companyId");
    const q = searchParams.get("q")?.trim() ?? "";
    const cursor = searchParams.get("cursor");
    const requestedTake = Number(searchParams.get("take") ?? MAX_PAGE_SIZE);
    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(requestedTake, 1), MAX_PAGE_SIZE)
      : MAX_PAGE_SIZE;

    let targetCompanyId = user.companyId;
    if (user.role === "SUPER_ADMIN") {
      targetCompanyId = companyParam || null;
    } else if (!targetCompanyId) {
      return jsonError("No company assigned", 403);
    }

    const manager = isManagerOrAdmin(user.role);
    // Non-managers can see tasks assigned to them OR created by them (self tasks)
    const where = {
      ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      ...(statusParam ? { status: statusParam } : {}),
      ...(priorityParam ? { priority: priorityParam } : {}),
      ...(manager
        ? assigneeParam
          ? {
              OR: [
                { assigneeId: assigneeParam },
                { assignees: { some: { userId: assigneeParam } } },
              ],
            }
          : {}
        : {
            OR: [
              { assigneeId: user.id },
              { assignees: { some: { userId: user.id } } },
              { creatorId: user.id },
            ],
          }),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: "insensitive" as const } },
                  { description: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : {}),
    };

    const rows = await prisma.task.findMany({
      where,
      select: TASK_LIST_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const tasks = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? tasks[tasks.length - 1]?.id ?? null : null;

    try {
      await Promise.allSettled([
        checkAndNotifyOverdueTasks(targetCompanyId || null),
        checkAndNotifyDueReminderTasks(targetCompanyId || null),
      ]);
    } catch (err) {
      console.error("[Tasks Route] Overdue/Reminder check error:", err);
    }

    return NextResponse.json({ tasks, nextCursor });
  } catch (error) {
    return apiError(error, "Failed to fetch tasks");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    if (user.role === "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin only manages companies. Tasks are managed by Company Admins and Managers.", 403);
    }

    const body = await req.json();
    const data = createTaskSchema.parse(body);

    const targetCompanyId = user.companyId;

    if (!targetCompanyId) {
      return jsonError("Target company required", 400);
    }

    // Collect all unique assignee IDs
    let allAssigneeIds: string[] = [];
    if (Array.isArray(data.assigneeIds) && data.assigneeIds.length > 0) {
      allAssigneeIds = Array.from(new Set(data.assigneeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)));
    } else if (data.assigneeId) {
      allAssigneeIds = [data.assigneeId];
    } else {
      allAssigneeIds = [user.id];
    }

    if (allAssigneeIds.length === 0) {
      allAssigneeIds = [user.id];
    }

    const finalAssigneeId = allAssigneeIds[0];

    const assignees = await prisma.user.findMany({
      where: { id: { in: allAssigneeIds } },
      select: { id: true, name: true, email: true, role: true, order: true, companyId: true },
    });

    if (assignees.length !== allAssigneeIds.length) {
      return jsonError("One or more assignees not found", 400);
    }

    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: {
        id: true,
        allowEmployeeTaskAssignment: true,
        enableTaskCreatedEmail: true,
      },
    });

    for (const assignee of assignees) {
      if (assignee.companyId !== targetCompanyId) {
        return jsonError(`Assignee ${assignee.name} must belong to your company`, 403);
      }

      // Check if employee assignment is disabled in company settings
      if (company && company.allowEmployeeTaskAssignment === false && user.role === "EMPLOYEE" && assignee.id !== user.id) {
        return jsonError("Task assignment by employees is disabled in company settings. Only managers and admins can assign tasks.", 403);
      }

      const assignmentCheck = canAssignTaskToUser(user, assignee);
      if (!assignmentCheck.allowed) {
        return jsonError(assignmentCheck.reason || `Assignment to ${assignee.name} forbidden`, 403);
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assigneeId: finalAssigneeId,
        creatorId: user.id,
        companyId: targetCompanyId,
        departmentId: data.departmentId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignees: {
          create: allAssigneeIds.map((uid) => ({ userId: uid })),
        },
      },
      select: TASK_LIST_SELECT,
    });

    const assigneeNames = assignees.map((a) => a.name || "Employee").join(", ");

    // Record Activity Log
    await logActivity({
      companyId: targetCompanyId,
      userId: user.id,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: task.id,
      description: `${user.name} created task "${task.title}" (Assigned to: ${assigneeNames})`,
      details: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        assigneeNames,
        assigneeCount: assignees.length,
        dueDate: task.dueDate,
      },
    });

    // Send email notification to all assignees if enabled in company settings
    if (company?.enableTaskCreatedEmail !== false) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://taskmanager-iit.vercel.app/";
      const taskUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;

      for (const assignee of assignees) {
        if (assignee?.email) {
          try {
            await sendTaskCreatedEmail({
              to: assignee.email,
              assigneeName: assignee.name || "Team Member",
              taskTitle: task.title,
              taskDescription: task.description,
              priority: task.priority,
              status: task.status,
              dueDate: task.dueDate,
              creatorName: user.name || "Manager",
              companyName: user.companyName,
              taskUrl,
            });
          } catch (err) {
            console.error(`Failed to send task notification email to ${assignee.email}:`, err);
          }
        }
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create task");
  }
}
