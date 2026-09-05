import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validations";
import { canManageEmployees } from "@/lib/domain";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageEmployees(user.role) || !user.companyId) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const employee = await prisma.user.findFirst({
      where: { id, companyId: user.companyId, role: "EMPLOYEE" },
      select: { id: true, name: true },
    });
    if (!employee) return jsonError("Employee not found", 404);

    const body = await req.json();
    const data = resetPasswordSchema.parse(body);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${employee.name}`,
    });
  } catch (error) {
    return apiError(error, "Failed to reset employee password");
  }
}
