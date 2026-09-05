import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError, USER_PUBLIC_SELECT } from "@/lib/http";
import { createEmployeeSchema } from "@/lib/validations";
import { canManageEmployees } from "@/lib/domain";
import { summarizeTasks } from "@/lib/task-stats";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!user.companyId) return jsonError("No company assigned", 403);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    const users = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: "EMPLOYEE",
        ...(departmentId ? { departmentId } : {}),
        ...(status === "active" ? { isActive: true } : {}),
        ...(status === "inactive" ? { isActive: false } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { employeeCode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        ...USER_PUBLIC_SELECT,
        assignedTasks: {
          select: { status: true, dueDate: true, completedAt: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const payload = users.map(({ assignedTasks, ...rest }) => ({
      ...rest,
      taskStats: summarizeTasks(assignedTasks),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, "Failed to fetch employees");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageEmployees(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const data = createEmployeeSchema.parse(body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(data.username ? [{ username: data.username }] : []),
        ],
      },
      select: { id: true, email: true, username: true },
    });
    if (existing) {
      if (existing.email === email) return jsonError("An employee with this email already exists", 400);
      return jsonError("Username already exists", 400);
    }

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!dept) return jsonError("Department not found", 400);
    }

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email,
        username: data.username || null,
        passwordHash: await hashPassword(data.password),
        role: "EMPLOYEE",
        phone: data.phone ?? null,
        employeeCode: data.employeeCode ?? null,
        designation: data.designation ?? null,
        isActive: data.isActive ?? true,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        companyId: user.companyId,
        departmentId: data.departmentId ?? null,
      },
      select: USER_PUBLIC_SELECT,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create employee");
  }
}
