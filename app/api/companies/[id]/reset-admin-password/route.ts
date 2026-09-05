import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validations";
import { canManageCompanies } from "@/lib/domain";

export async function POST(
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
    const data = resetPasswordSchema.parse(body);

    const admin = await prisma.user.findFirst({
      where: { companyId: id, role: { in: ["ADMIN", "MANAGER"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    });

    if (!admin) return jsonError("Company admin not found", 404);

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${admin.name}`,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    return apiError(error, "Failed to reset admin password");
  }
}
