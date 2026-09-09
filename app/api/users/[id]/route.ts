import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, role, designation, departmentId, department, shiftId, phone, order } = body || {};

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      targetUser.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let deptName = department || targetUser.department;
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (dept) deptName = dept.name;
    }

    let newOrder: number | undefined = undefined;
    if (order !== undefined && order !== null && !isNaN(Number(order))) {
      newOrder = Math.max(0, Number(order));
      const oldOrder = targetUser.order ?? 0;

      if (newOrder !== oldOrder && targetUser.companyId) {
        if (newOrder < oldOrder) {
          // Moving up in seniority (e.g. from #5 to #1): shift members in [newOrder, oldOrder - 1] down (+1)
          await prisma.user.updateMany({
            where: {
              companyId: targetUser.companyId,
              id: { not: id },
              order: {
                gte: newOrder,
                lt: oldOrder,
              },
            },
            data: {
              order: { increment: 1 },
            },
          });
        } else {
          // Moving down in seniority (e.g. from #1 to #5): shift members in [oldOrder + 1, newOrder] up (-1)
          await prisma.user.updateMany({
            where: {
              companyId: targetUser.companyId,
              id: { not: id },
              order: {
                gt: oldOrder,
                lte: newOrder,
              },
            },
            data: {
              order: { decrement: 1 },
            },
          });
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(role ? { role } : {}),
        ...(designation !== undefined ? { designation: designation ? designation.trim() : null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
        ...(shiftId !== undefined ? { shiftId: shiftId || null } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(newOrder !== undefined ? { order: newOrder } : {}),
        department: deptName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        designation: true,
        department: true,
        departmentId: true,
        shiftId: true,
        order: true,
        shift: {
          select: { id: true, name: true, startTime: true, endTime: true },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    console.error("PUT user error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update user." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      targetUser.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete user's comments and reassign/delete tasks, then close the order gap
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { authorId: id } }),
      prisma.task.deleteMany({ where: { assigneeId: id } }),
      prisma.user.delete({ where: { id } }),
      ...(targetUser.companyId
        ? [
            prisma.user.updateMany({
              where: {
                companyId: targetUser.companyId,
                order: { gt: targetUser.order },
              },
              data: {
                order: { decrement: 1 },
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, message: "User deleted successfully." });
  } catch (err: any) {
    console.error("DELETE user error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete user." },
      { status: 500 }
    );
  }
}
