import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const updateCompanySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
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

    const updateData: any = {};
    if (typeof data.isActive === "boolean") updateData.isActive = data.isActive;
    if (data.name) updateData.name = data.name.trim();
    if (data.slug) updateData.slug = data.slug.trim().toLowerCase();

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
      },
    });

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
