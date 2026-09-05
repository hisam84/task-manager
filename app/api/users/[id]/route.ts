import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError, USER_PUBLIC_SELECT } from "@/lib/http";
import { patchEmployeeSchema } from "@/lib/validations";
import { canManageEmployees } from "@/lib/domain";

async function loadOwnedEmployee(id: string, companyId: string) {
  return prisma.user.findFirst({
    where: { id, companyId, role: "EMPLOYEE" },
    select: { id: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageEmployees(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const existing = await loadOwnedEmployee(id, user.companyId);
    if (!existing) return jsonError("Employee not found", 404);

    const body = await req.json();
    const data = patchEmployeeSchema.parse(body);

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!dept) return jsonError("Department not found", 400);
    }

    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email.toLowerCase(), NOT: { id } },
        select: { id: true },
      });
      if (clash) return jsonError("An employee with this email already exists", 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.username !== undefined ? { username: data.username || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.employeeCode !== undefined ? { employeeCode: data.employeeCode } : {}),
        ...(data.designation !== undefined ? { designation: data.designation } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
        ...(data.joiningDate !== undefined
          ? { joiningDate: data.joiningDate ? new Date(data.joiningDate) : null }
          : {}),
        ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, "Failed to update employee");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageEmployees(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const existing = await loadOwnedEmployee(id, user.companyId);
    if (!existing) return jsonError("Employee not found", 404);

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, "Failed to delete employee");
  }
}
