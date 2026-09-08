import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { checkLoginRateLimit, getClientIp } from "@/lib/session";
import { sendPasswordResetOtpEmail } from "@/lib/mail";
import { apiError, jsonError } from "@/lib/http";

const forgotPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required").max(255),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!checkLoginRateLimit(`forgot-password:${ip}`)) {
      return jsonError("Too many password reset requests. Please try again later.", 429);
    }

    const body = await req.json();
    const data = forgotPasswordSchema.parse(body);
    const input = data.usernameOrEmail.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: input, mode: "insensitive" } },
          { email: input.toLowerCase() },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      // Return success simulation for security
      return NextResponse.json({
        success: true,
        emailMasked: "your registered email",
        message: "If an account matches that username or email, an OTP verification code has been sent.",
      });
    }

    // Generate random 6-digit OTP code (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up older tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Save 6-digit OTP token
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: otp,
        expiresAt,
      },
    });

    // Send email with 6-digit OTP
    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    const masked = maskEmail(user.email);
    return NextResponse.json({
      success: true,
      emailMasked: masked,
      usernameOrEmail: input,
      message: `A 6-digit verification code (OTP) has been sent to ${masked}. Valid for 10 minutes.`,
    });
  } catch (error) {
    return apiError(error, "Failed to send password reset OTP");
  }
}
