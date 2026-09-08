import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

const resetPasswordSchema = z.object({
  usernameOrEmail: z.string().optional(),
  otp: z.string().optional(),
  token: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(256),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usernameOrEmail, otp, token, password } = resetPasswordSchema.parse(body);

    const otpClean = (otp || token || "").trim();
    if (!otpClean) {
      return jsonError("Verification OTP code is required.", 400);
    }

    let userEmail: string | null = null;
    let userId: string | null = null;
    let tokenRecordId: string | null = null;

    if (usernameOrEmail && usernameOrEmail.trim()) {
      const input = usernameOrEmail.trim();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: input, mode: "insensitive" } },
            { email: input.toLowerCase() },
          ],
        },
        select: { id: true, email: true },
      });

      if (!user) {
        return jsonError("Account not found for that username or email.", 404);
      }

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          email: user.email,
          token: otpClean,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!tokenRecord) {
        return jsonError("Invalid verification code (OTP). Please check and try again.", 400);
      }

      if (tokenRecord.expiresAt < new Date()) {
        await prisma.passwordResetToken.deleteMany({
          where: { email: user.email },
        });
        return jsonError("This verification code (OTP) has expired. Please request a new code.", 400);
      }

      userEmail = user.email;
      userId = user.id;
      tokenRecordId = tokenRecord.id;
    } else {
      // Fallback lookup by token string alone
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { token: otpClean },
        orderBy: { createdAt: "desc" },
      });

      if (!tokenRecord) {
        return jsonError("Invalid or expired verification code.", 400);
      }

      if (tokenRecord.expiresAt < new Date()) {
        await prisma.passwordResetToken.deleteMany({
          where: { email: tokenRecord.email },
        });
        return jsonError("This verification code has expired. Please request a new code.", 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: tokenRecord.email },
        select: { id: true, email: true },
      });

      if (!user) {
        return jsonError("User account not found.", 404);
      }

      userEmail = user.email;
      userId = user.id;
      tokenRecordId = tokenRecord.id;
    }

    const passwordHash = await hashPassword(password);

    // Update password and clean up reset tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email: userEmail },
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
