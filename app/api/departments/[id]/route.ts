import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { departmentSchema } from "@/lib/validations";
import { canDeleteDepartment, canManageDepartments } from "@/lib/domain";

async function loadOwnedDepartment(id: string, companyId: string) {
  return prisma.department.findFirst({
    where: { id, companyId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true, tasks: true } },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageDepartments(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const existing = await loadOwnedDepartment(id, user.companyId);
    if (!existing) return jsonError("Department not found", 404);

    const body = await req.json();
    const data = departmentSchema.partial().parse(body);

    if (data.name && data.name !== existing.name) {
      const clash = await prisma.department.findFirst({
        where: { companyId: user.companyId, name: data.name, NOT: { id } },
        select: { id: true },
      });
      if (clash) return jsonError("A department with this name already exists", 400);
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, tasks: true } },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    return apiError(error, "Failed to update department");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageDepartments(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const existing = await loadOwnedDepartment(id, user.companyId);
    if (!existing) return jsonError("Department not found", 404);

    if (!canDeleteDepartment(existing._count.users, existing._count.tasks)) {
      return jsonError(
        "Reassign or remove employees and tasks before deleting this department",
        400
      );
    }

    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, "Failed to delete department");
  }
}
