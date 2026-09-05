import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { patchCompanySchema } from "@/lib/validations";
import { canManageCompanies } from "@/lib/domain";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageCompanies(user.role)) {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const { id } = await params;
    const company = await prisma.company.findUnique({
      where: { id },
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
          select: { id: true, name: true, email: true, username: true, role: true },
        },
        _count: { select: { users: true, tasks: true, departments: true } },
      },
    });

    if (!company) return jsonError("Company not found", 404);
    return NextResponse.json(company);
  } catch (error) {
    return apiError(error, "Failed to fetch company");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageCompanies(user.role)) {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const data = patchCompanySchema.parse(body);

    const existing = await prisma.company.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return jsonError("Company not found", 404);

    if (data.adminEmail) {
      const clash = await prisma.user.findFirst({
        where: { email: data.adminEmail.toLowerCase(), NOT: { companyId: id } },
        select: { id: true },
      });
      if (clash) return jsonError("Admin email already exists", 400);
    }

    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail } : {}),
          ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
          ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          contactEmail: true,
          contactPhone: true,
          createdAt: true,
        },
      });

      if (data.adminName || data.adminEmail) {
        const admin = await tx.user.findFirst({
          where: { companyId: id, role: { in: ["ADMIN", "MANAGER"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (admin) {
          await tx.user.update({
            where: { id: admin.id },
            data: {
              ...(data.adminName ? { name: data.adminName } : {}),
              ...(data.adminEmail ? { email: data.adminEmail.toLowerCase() } : {}),
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json(company);
  } catch (error) {
    return apiError(error, "Failed to update company");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageCompanies(user.role)) {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const { id } = await params;
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { users: true, tasks: true } } },
    });
    if (!company) return jsonError("Company not found", 404);

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      deletedId: id,
      message: `Deleted ${company.name} and all related departments, employees, and tasks.`,
    });
  } catch (error) {
    return apiError(error, "Failed to delete company");
  }
}
