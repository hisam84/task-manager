import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && task.companyId !== user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch task detail" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && existingTask.companyId !== user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAssignee = existingTask.assigneeId === user.id;
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role);

    if (!isManagerOrAdmin && !isAssignee) {
      return NextResponse.json({ error: "Forbidden: Not assigned to task" }, { status: 403 });
    }

    const updateData: any = {};
    if (body.status && ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (isManagerOrAdmin) {
      if (body.title) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.priority) updateData.priority = body.priority;
      if (body.assigneeId) updateData.assigneeId = body.assigneeId;
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: true,
        creator: true,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && task.companyId !== user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete task" }, { status: 500 });
  }
}
