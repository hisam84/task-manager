import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError, USER_PUBLIC_SELECT } from "@/lib/http";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    return NextResponse.json(user);
  } catch (error) {
    return apiError(error, "Failed to load profile");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const data = profileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, "Failed to update profile");
  }
}
