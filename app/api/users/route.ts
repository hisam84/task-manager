import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  department: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").default("password123"),
  companyId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCompanyId = searchParams.get("companyId");

    const targetCompanyId = user.role === "SUPER_ADMIN" ? requestedCompanyId || user.companyId : user.companyId;

    if (!targetCompanyId && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
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
          select: {
            id: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Admin or Manager required" }, { status: 403 });
    }

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const targetCompanyId = user.role === "SUPER_ADMIN" ? data.companyId || user.companyId : user.companyId;

    if (!targetCompanyId) {
      return NextResponse.json({ error: "Target company is required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        department: data.department || "General",
        companyId: targetCompanyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
