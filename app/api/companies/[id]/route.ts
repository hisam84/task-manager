import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const patchCompanySchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
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
    const data = patchCompanySchema.parse(body);

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
        ...(data.name ? { name: data.name } : {}),
      },
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
