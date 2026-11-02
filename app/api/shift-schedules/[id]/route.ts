import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id },
      include: {
        days: {
          include: { shift: true },
          orderBy: { dayOfWeek: "asc" },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      schedule.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(schedule);
  } catch (err: any) {
    console.error("GET shift schedule error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shift schedule." },
      { status: 500 }
    );
  }
}

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
    const existing = await prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      existing.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, days } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Schedule name is required." }, { status: 400 });
    }

    const daysData = Array.isArray(days)
      ? days.map((d: any) => ({
          dayOfWeek: Number(d.dayOfWeek),
          isWeekend: Boolean(d.isWeekend),
          shiftId: d.shiftId && !d.isWeekend ? String(d.shiftId) : null,
        }))
      : [];

    // Transaction to update schedule and refresh days
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing days
      await tx.shiftScheduleDay.deleteMany({
        where: { scheduleId: id },
      });

      // Update name and re-create days
      return tx.shiftSchedule.update({
        where: { id },
        data: {
          name: name.trim(),
          days: {
            create: daysData.filter((d: any) => d.dayOfWeek >= 0 && d.dayOfWeek <= 6),
          },
        },
        include: {
          days: {
            include: { shift: true },
            orderBy: { dayOfWeek: "asc" },
          },
          _count: {
            select: { users: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT shift schedule error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update shift schedule." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const existing = await prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      existing.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.shiftSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Shift schedule deleted successfully." });
  } catch (err: any) {
    console.error("DELETE shift schedule error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete shift schedule." },
      { status: 500 }
    );
  }
}

