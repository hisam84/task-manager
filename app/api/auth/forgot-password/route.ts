import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { checkLoginRateLimit, getClientIp } from "@/lib/session";
import { sendPasswordResetEmail } from "@/lib/mail";
import { apiError, jsonError } from "@/lib/http";

const forgotPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required").max(255),
});

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
      // Return ambiguous success for security (prevents user enumeration)
      return NextResponse.json({
        success: true,
        message: "If an account matches that username or email, a password reset link has been sent.",
      });
    }

    // Generate random 64-character hex token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean up older tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Save token
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    // Determine application URL origin
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const origin = req.headers.get("origin") || (host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Send email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json({
      success: true,
      message: `A password reset link has been sent to ${user.email}. Please check your inbox.`,
    });
  } catch (error) {
    return apiError(error, "Failed to send password reset email");
  }
}
