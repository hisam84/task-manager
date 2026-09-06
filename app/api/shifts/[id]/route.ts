import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found." }, { status: 404 });
    }

    if (sessionUser.role !== "SUPER_ADMIN" && shift.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, startTime, endTime, graceMinutes } = body || {};

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(startTime && { startTime: startTime.trim() }),
        ...(endTime && { endTime: endTime.trim() }),
        ...(typeof graceMinutes === "number" && { graceMinutes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT shift error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update shift." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found." }, { status: 404 });
    }

    if (sessionUser.role !== "SUPER_ADMIN" && shift.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unassign shift from users first
    await prisma.user.updateMany({
      where: { shiftId: id },
      data: { shiftId: null },
    });

    await prisma.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE shift error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete shift." },
      { status: 500 }
    );
  }
}
