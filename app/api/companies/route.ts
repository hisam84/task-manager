import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, hyphens"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  department: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
        _count: {
          select: { users: true, tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const data = createCompanySchema.parse(body);

    const existingSlug = await prisma.company.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      return NextResponse.json({ error: "Company slug already exists" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Admin email already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(data.adminPassword);

    const company = await prisma.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        isActive: true,
        users: {
          create: {
            name: data.adminName,
            email: data.adminEmail,
            passwordHash,
            role: "ADMIN",
            department: data.department || "Executive Leadership",
          },
        },
      },
      include: {
        users: true,
        _count: { select: { users: true, tasks: true } },
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create company" }, { status: 500 });
  }
}
