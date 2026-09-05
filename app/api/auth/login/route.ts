import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE,
  checkLoginRateLimit,
  resetLoginRateLimit,
  createSessionValue,
  getClientIp,
  sessionCookieOptions,
} from "@/lib/session";
import { apiError, jsonError } from "@/lib/http";

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required").max(255),
  password: z.string().min(1, "Password is required").max(256),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!checkLoginRateLimit(`login:${ip}`)) {
      return jsonError("Too many login attempts. Try again later.", 429);
    }

    const body = await req.json();
    const data = loginSchema.parse(body);
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
        username: true,
        role: true,
        department: true,
        passwordHash: true,
        company: { select: { name: true, isActive: true } },
      },
    });

    if (!user) {
      return jsonError("Invalid username/email or password", 401);
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return jsonError("Invalid username/email or password", 401);
    }

    resetLoginRateLimit(`login:${ip}`);

    if (user.role !== "SUPER_ADMIN" && user.company && user.company.isActive === false) {
      return jsonError("Company account is inactive", 403);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        department: user.department,
        companyName: user.company?.name ?? null,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to login");
  }
}
