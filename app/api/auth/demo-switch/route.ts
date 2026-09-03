import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { demoSwitchEnabled } from "@/lib/auth";
import {
  SESSION_COOKIE,
  createSessionValue,
  sessionCookieOptions,
} from "@/lib/session";
import { apiError, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    if (!demoSwitchEnabled()) {
      return jsonError("Demo persona switch is disabled", 403);
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return jsonError("User ID is required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        companyId: true,
        company: { select: { name: true } },
      },
    });

    if (!user) {
      return jsonError("User not found", 404);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        companyId: user.companyId,
        companyName: user.company?.name ?? "Platform Wide",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to switch persona");
  }
}
