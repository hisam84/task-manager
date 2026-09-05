import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { createCompanySchema } from "@/lib/validations";
import { canManageCompanies } from "@/lib/domain";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageCompanies(user.role)) {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        users: {
          where: { role: { in: ["ADMIN", "MANAGER"] } },
          select: { id: true, name: true, email: true, username: true },
          take: 3,
        },
        _count: {
          select: { users: true, tasks: true, departments: true },
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
    if (!currentUser || !canManageCompanies(currentUser.role)) {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const body = await req.json();
    const data = createCompanySchema.parse(body);

    const [existingSlug, existingEmail, existingUsername] = await Promise.all([
      prisma.company.findUnique({ where: { slug: data.slug }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: data.adminEmail.toLowerCase() }, select: { id: true } }),
      prisma.user.findUnique({ where: { username: data.adminUsername }, select: { id: true } }),
    ]);

    if (existingSlug) return jsonError("Company code already exists", 400);
    if (existingEmail) return jsonError("Admin email already exists", 400);
    if (existingUsername) return jsonError("Admin username already exists", 400);

    const passwordHash = await hashPassword(data.adminPassword);

    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: data.name,
          slug: data.slug,
          isActive: data.isActive ?? true,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
        },
      });

      const general = await tx.department.create({
        data: {
          name: "General",
          description: "Default department",
          companyId: created.id,
        },
      });

      await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail.toLowerCase(),
          username: data.adminUsername,
          passwordHash,
          role: "ADMIN",
          designation: "Company Admin",
          companyId: created.id,
          departmentId: general.id,
        },
      });

      return tx.company.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          contactEmail: true,
          contactPhone: true,
          createdAt: true,
          users: {
            where: { role: { in: ["ADMIN", "MANAGER"] } },
            select: { id: true, name: true, email: true, username: true },
            take: 3,
          },
          _count: { select: { users: true, tasks: true, departments: true } },
        },
      });
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create company");
  }
}
