import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const updateCompanySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  enableLatePenalty: z.boolean().optional(),
  subscriptionEndsAt: z.string().optional().nullable(),
  adminName: z.string().min(1).max(120).optional(),
  adminEmail: z.string().email().optional(),
  adminUsername: z.string().min(3).max(40).optional(),
  adminPassword: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateCompanySchema.parse(body);

    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: "ADMIN" },
          take: 1,
        },
      },
    });

    if (!existingCompany) {
      return jsonError("Company not found", 404);
    }

    const updateData: any = {};
    if (typeof data.isActive === "boolean") updateData.isActive = data.isActive;
    if (typeof data.enableLatePenalty === "boolean") updateData.enableLatePenalty = data.enableLatePenalty;
    if (data.subscriptionEndsAt !== undefined) {
      updateData.subscriptionEndsAt = data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : null;
    }
    if (data.name) updateData.name = data.name.trim();
    if (data.slug) {
      const slugClean = data.slug.trim().toLowerCase();
      if (slugClean !== existingCompany.slug) {
        const slugExists = await prisma.company.findUnique({ where: { slug: slugClean } });
        if (slugExists) return jsonError("Slug is already taken by another company", 400);
      }
      updateData.slug = slugClean;
    }

    const primaryAdmin = existingCompany.users[0];
    const adminUpdateData: any = {};

    if (primaryAdmin) {
      if (data.adminName && data.adminName.trim()) {
        adminUpdateData.name = data.adminName.trim();
      }
      if (data.adminEmail && data.adminEmail.trim()) {
        const emailClean = data.adminEmail.trim().toLowerCase();
        if (emailClean !== primaryAdmin.email) {
          const emailExists = await prisma.user.findUnique({ where: { email: emailClean } });
          if (emailExists) return jsonError("Email is already in use by another account", 400);
          adminUpdateData.email = emailClean;
        }
      }
      if (data.adminUsername && data.adminUsername.trim()) {
        const usernameClean = data.adminUsername.trim();
        if (usernameClean !== primaryAdmin.username) {
          const usernameExists = await prisma.user.findUnique({ where: { username: usernameClean } });
          if (usernameExists) return jsonError("Username is already in use by another account", 400);
          adminUpdateData.username = usernameClean;
        }
      }
      if (data.adminPassword && data.adminPassword.trim().length >= 6) {
        adminUpdateData.passwordHash = await hashPassword(data.adminPassword.trim());
      }
    }

    const [company] = await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          enableLatePenalty: true,
          subscriptionEndsAt: true,
          createdAt: true,
        },
      }),
      ...(primaryAdmin && Object.keys(adminUpdateData).length > 0
        ? [
            prisma.user.update({
              where: { id: primaryAdmin.id },
              data: adminUpdateData,
            }),
          ]
        : []),
    ]);

    return NextResponse.json(company);
  } catch (error) {
    return apiError(error, "Failed to update company");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return jsonError("Forbidden: Super Admin required", 403);
    }

    const { id } = await params;

    // Delete tasks, comments, departments, and un-associate/delete users
    await prisma.$transaction([
      prisma.comment.deleteMany({
        where: { task: { companyId: id } },
      }),
      prisma.task.deleteMany({
        where: { companyId: id },
      }),
      (prisma as any).department.deleteMany({
        where: { companyId: id },
      }),
      prisma.user.deleteMany({
        where: { companyId: id },
      }),
      prisma.company.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Company deleted successfully." });
  } catch (error) {
    return apiError(error, "Failed to delete company");
  }
}
