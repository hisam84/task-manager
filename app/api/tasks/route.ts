import { NextResponse } from "next/server";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError, TASK_LIST_SELECT } from "@/lib/http";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  assigneeId: z.string().optional().nullable(),
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
          ? { assigneeId: assigneeParam }
          : {}
        : { OR: [{ assigneeId: user.id }, { creatorId: user.id }] }),
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

    const isManager = isManagerOrAdmin(user.role);
    // If not manager, forced self-assignment
    const finalAssigneeId = isManager ? data.assigneeId || user.id : user.id;

    const assignee = await prisma.user.findUnique({
      where: { id: finalAssigneeId },
      select: { id: true, companyId: true },
    });

    if (!assignee) {
      return jsonError("Assignee not found", 400);
    }

    if (assignee.companyId !== targetCompanyId) {
      return jsonError("Assignee must belong to your company", 403);
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
      },
      select: TASK_LIST_SELECT,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create task");
  }
}
