import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(120),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, hyphens"),
  adminName: z.string().min(1, "Admin name is required").max(120),
  adminUsername: z
    .string()
    .min(3, "Admin username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  adminEmail: z.string().email("Valid admin email is required").max(255),
  adminPassword: z.string().min(6, "Password must be at least 6 characters").max(128),
  department: z.string().max(120).optional(),
  enableLatePenalty: z.boolean().default(false),
  subscriptionEndsAt: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        enableLatePenalty: true,
        subscriptionEndsAt: true,
        createdAt: true,
        users: {
          where: { role: "ADMIN" },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
          take: 1,
        },
        _count: {
          select: { users: true, tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(companies);
  } catch (error) {
    return apiError(error, "Failed to fetch companies");
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const body = await req.json();
    const data = createCompanySchema.parse(body);

    const [existingSlug, existingEmail, existingUsername] = await Promise.all([
      prisma.company.findUnique({ where: { slug: data.slug }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: data.adminEmail.toLowerCase() }, select: { id: true } }),
      prisma.user.findUnique({ where: { username: data.adminUsername }, select: { id: true } }),
    ]);

    if (existingSlug) {
      return jsonError("Company slug already exists", 400);
    }
    if (existingEmail) {
      return jsonError("Admin email already exists", 400);
    }
    if (existingUsername) {
      return jsonError("Admin username already exists", 400);
    }

    const passwordHash = await hashPassword(data.adminPassword);

    const company = await prisma.$transaction(async (tx) => {
      return tx.company.create({
        data: {
          name: data.name,
          slug: data.slug,
          isActive: true,
          enableLatePenalty: data.enableLatePenalty ?? false,
          subscriptionEndsAt: data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : null,
          users: {
            create: {
              name: data.adminName,
              email: data.adminEmail.toLowerCase(),
              username: data.adminUsername,
              passwordHash,
              role: "ADMIN",
              department: data.department || "Executive Leadership",
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          enableLatePenalty: true,
          subscriptionEndsAt: true,
          createdAt: true,
          _count: { select: { users: true, tasks: true } },
        },
      });
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create company");
  }
}
