import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError, serializeTask, TASK_LIST_SELECT } from "@/lib/http";
import { createTaskSchema } from "@/lib/validations";
import { canAssignCompanyTasks, canCreateSelfTask, isCompanyAdmin, statusFromProgress } from "@/lib/domain";
import { logTaskActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!user.companyId) return jsonError("No company assigned", 403);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assigneeParam = searchParams.get("assigneeId");
    const departmentParam = searchParams.get("departmentId");
    const selfParam = searchParams.get("self");
    const overdueParam = searchParams.get("overdue");
    const q = searchParams.get("q")?.trim() ?? "";
    const cursor = searchParams.get("cursor");
    const requestedTake = Number(searchParams.get("take") ?? MAX_PAGE_SIZE);
    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(requestedTake, 1), MAX_PAGE_SIZE)
      : MAX_PAGE_SIZE;

    const manager = isCompanyAdmin(user.role);
    const filterAssignee = manager ? assigneeParam : user.id;

    const where: Prisma.TaskWhereInput = {
      companyId: user.companyId,
      ...(priorityParam ? { priority: priorityParam } : {}),
      ...(filterAssignee ? { assigneeId: filterAssignee } : {}),
      ...(departmentParam ? { departmentId: departmentParam } : {}),
      ...(selfParam === "true" ? { isSelfTask: true } : {}),
      ...(selfParam === "false" ? { isSelfTask: false } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (statusParam === "OVERDUE" || overdueParam === "true") {
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      where.dueDate = { lt: new Date() };
    } else if (statusParam) {
      where.status = statusParam;
    }

    const rows = await prisma.task.findMany({
      where,
      select: TASK_LIST_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const tasks = (hasMore ? rows.slice(0, take) : rows).map(serializeTask);
    const nextCursor = hasMore ? tasks[tasks.length - 1]?.id ?? null : null;

    return NextResponse.json({ tasks, nextCursor });
  } catch (error) {
    return apiError(error, "Failed to fetch tasks");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) return jsonError("Forbidden", 403);

    const body = await req.json();
    const data = createTaskSchema.parse(body);
    const selfTask = Boolean(data.isSelfTask) || canCreateSelfTask(user.role);

    if (selfTask && !canCreateSelfTask(user.role)) {
      return jsonError("Only employees can create self tasks", 403);
    }
    if (!selfTask && !canAssignCompanyTasks(user.role)) {
      return jsonError("Only company admins can assign company tasks", 403);
    }

    const assigneeId = selfTask ? user.id : data.assigneeId;
    if (!assigneeId) return jsonError("Assigned employee is required", 400);

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, companyId: true, departmentId: true, role: true },
    });
    if (!assignee || assignee.companyId !== user.companyId) {
      return jsonError("Assignee must belong to your company", 403);
    }

    let departmentId = data.departmentId ?? assignee.departmentId ?? null;
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!dept) return jsonError("Department not found", 400);
    }

    const progress = data.progress ?? (data.status === "COMPLETED" ? 100 : 0);
    const status = statusFromProgress(progress, data.status);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status,
        progress,
        isSelfTask: selfTask,
        assigneeId,
        creatorId: user.id,
        companyId: user.companyId,
        departmentId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
        adminComment: selfTask ? null : data.adminComment ?? null,
        employeeComment: selfTask ? data.employeeComment ?? null : null,
      },
      select: TASK_LIST_SELECT,
    });

    await logTaskActivity({
      taskId: task.id,
      actorId: user.id,
      action: "created",
      detail: selfTask ? "Self task created" : `Assigned to ${assignee.id}`,
    });

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create task");
  }
}
