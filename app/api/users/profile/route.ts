import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        avatar: true,
        designation: true,
        department: true,
        companyId: true,
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    console.error("GET /api/users/profile error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, avatar, designation, phone } = body || {};

    const updateData: any = {};

    if (name !== undefined) {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName || trimmedName.length < 2) {
        return NextResponse.json(
          { error: "Name must be at least 2 characters long." },
          { status: 400 }
        );
      }
      if (trimmedName.length > 100) {
        return NextResponse.json(
          { error: "Name must be under 100 characters." },
          { status: 400 }
        );
      }
      updateData.name = trimmedName;
    }

    if (designation !== undefined) {
      updateData.designation = typeof designation === "string" ? designation.trim() || null : null;
    }

    if (phone !== undefined) {
      updateData.phone = typeof phone === "string" ? phone.trim() || null : null;
    }

    if (avatar !== undefined) {
      if (avatar === null || avatar === "") {
        updateData.avatar = null;
      } else if (typeof avatar === "string") {
        // Prevent unusually large payloads (> 3MB string)
        if (avatar.length > 3 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Avatar image is too large. Please select a smaller photo." },
            { status: 400 }
          );
        }
        updateData.avatar = avatar;
      } else {
        return NextResponse.json(
          { error: "Invalid avatar format." },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        avatar: true,
        designation: true,
        department: true,
        companyId: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        ...updatedUser,
        role: updatedUser.role as any,
        companyName: sessionUser.companyName,
        companySlug: sessionUser.companySlug,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/users/profile error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  return PATCH(req);
}
