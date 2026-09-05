import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) return jsonError("User not found", 404);

    const matches = await verifyPassword(data.currentPassword, record.passwordHash);
    if (!matches) return jsonError("Current password is incorrect", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    });

    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (error) {
    return apiError(error, "Failed to change password");
  }
}
