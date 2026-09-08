import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(256),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return jsonError("Invalid or expired password reset link.", 400);
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });
      return jsonError("This password reset link has expired. Please request a new one.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
      select: { id: true, email: true },
    });

    if (!user) {
      return jsonError("User account not found.", 404);
    }

    const passwordHash = await hashPassword(password);

    // Update password and delete used token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now log in with your new password.",
    });
  } catch (error) {
    return apiError(error, "Failed to reset password");
  }
}
