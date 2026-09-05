import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetUserId } = await params;
    const body = await req.json();
    const { newPassword } = body || {};

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // Permission checks:
    // SUPER_ADMIN can reset any user's password.
    // ADMIN (Company Admin) can reset employees' passwords within their company.
    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";
    const isCompanyAdmin =
      sessionUser.role === "ADMIN" &&
      sessionUser.companyId &&
      targetUser.companyId === sessionUser.companyId;

    if (!isSuperAdmin && !isCompanyAdmin) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to reset this user's password." },
        { status: 403 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: `Password for ${targetUser.name} has been reset successfully.`,
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}
