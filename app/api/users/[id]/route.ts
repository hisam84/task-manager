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
    const { name, email, role, designation, departmentId, department } = body || {};

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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(role ? { role } : {}),
        ...(designation !== undefined ? { designation: designation ? designation.trim() : null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
        department: deptName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        designation: true,
        department: true,
        departmentId: true,
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

    // Delete user's comments and reassign/delete tasks
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { authorId: id } }),
      prisma.task.deleteMany({ where: { assigneeId: id } }),
      prisma.user.delete({ where: { id } }),
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
