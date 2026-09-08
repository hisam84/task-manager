import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, isManagerOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email is required").max(255),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  designation: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  shiftId: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  companyId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const requestedCompanyId = searchParams.get("companyId");
    const targetCompanyId =
      user.role === "SUPER_ADMIN" ? requestedCompanyId || user.companyId : user.companyId;

    if (!targetCompanyId && user.role !== "SUPER_ADMIN") {
      return jsonError("Company ID required", 400);
    }

    const users = await prisma.user.findMany({
      where: {
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        designation: true,
        department: true,
        departmentId: true,
        departmentRel: {
          select: { id: true, name: true },
        },
        shiftId: true,
        shift: {
          select: { id: true, name: true, startTime: true, endTime: true },
        },
        createdAt: true,
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
          },
        },
        assignedTasks: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const payload = users.map(({ assignedTasks, ...rest }) => ({
      ...rest,
      departmentName: rest.departmentRel?.name || rest.department || "General",
      taskStats: {
        total: assignedTasks.length,
        active: assignedTasks.filter((t) => t.status !== "DONE").length,
        done: assignedTasks.filter((t) => t.status === "DONE").length,
      },
    }));

    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, "Failed to fetch users");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManagerOrAdmin(user.role)) {
      return jsonError("Forbidden: Admin or Manager required", 403);
    }

    if (user.role === "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin only manages companies. Employees are managed by Company Admins and Managers.", 403);
    }

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const targetCompanyId = user.companyId;

    if (!targetCompanyId) {
      return jsonError("Target company is required", 400);
    }

    if (user.role === "MANAGER" && data.role !== "EMPLOYEE") {
      return jsonError("Managers can only create employees", 403);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("User with this email already exists", 400);
    }

    const passwordHash = await hashPassword(data.password);

    // Check department name if departmentId is supplied
    let deptName = data.department || "General";
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (dept) deptName = dept.name;
    }

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        designation: data.designation?.trim() || null,
        department: deptName,
        departmentId: data.departmentId || null,
        shiftId: data.shiftId || null,
        companyId: targetCompanyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: true,
        departmentId: true,
        shiftId: true,
        shift: {
          select: { id: true, name: true, startTime: true, endTime: true },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create user");
  }
}
