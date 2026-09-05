import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { departmentSchema } from "@/lib/validations";
import { canManageDepartments } from "@/lib/domain";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!user.companyId) return jsonError("No company assigned", 403);

    const departments = await prisma.department.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, tasks: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json(departments);
  } catch (error) {
    return apiError(error, "Failed to fetch departments");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageDepartments(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const data = departmentSchema.parse(body);

    const existing = await prisma.department.findFirst({
      where: { companyId: user.companyId, name: data.name },
      select: { id: true },
    });
    if (existing) return jsonError("A department with this name already exists", 400);

    const department = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
        companyId: user.companyId,
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

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create department");
  }
}
