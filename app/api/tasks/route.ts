import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  assigneeId: z.string().min(1, "Assignee is required"),
  dueDate: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assigneeParam = searchParams.get("assigneeId");
    const companyParam = searchParams.get("companyId");

    let targetCompanyId = user.companyId;
    if (user.role === "SUPER_ADMIN") {
      targetCompanyId = companyParam || null;
    } else if (!targetCompanyId) {
      return NextResponse.json({ error: "No company assigned" }, { status: 403 });
    }

    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role);
    const filterAssignee = isManagerOrAdmin ? assigneeParam : user.id;

    const tasks = await prisma.task.findMany({
      where: {
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
        ...(statusParam ? { status: statusParam } : {}),
        ...(priorityParam ? { priority: priorityParam } : {}),
        ...(filterAssignee ? { assigneeId: filterAssignee } : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, department: true },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Manager or Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const data = createTaskSchema.parse(body);

    const targetCompanyId = user.role === "SUPER_ADMIN" ? body.companyId || user.companyId : user.companyId;

    if (!targetCompanyId) {
      return NextResponse.json({ error: "Target company required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assigneeId: data.assigneeId,
        creatorId: user.id,
        companyId: targetCompanyId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: true,
        creator: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
  }
}
