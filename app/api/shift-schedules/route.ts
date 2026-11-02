import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = sessionUser.companyId;
    if (!companyId && sessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const filterCompanyId = searchParams.get("companyId") || companyId;

    if (!filterCompanyId) {
      return NextResponse.json([]);
    }

    const schedules = await prisma.shiftSchedule.findMany({
      where: { companyId: filterCompanyId },
      include: {
        days: {
          include: { shift: true },
          orderBy: { dayOfWeek: "asc" },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(schedules);
  } catch (err: any) {
    console.error("GET shift-schedules error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shift schedules." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, days, companyId: requestedCompanyId } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Schedule name is required." }, { status: 400 });
    }

    const companyId =
      sessionUser.role === "SUPER_ADMIN"
        ? requestedCompanyId || sessionUser.companyId
        : sessionUser.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }

    // Process days: ensure 0 to 6
    const daysData = Array.isArray(days)
      ? days.map((d: any) => ({
          dayOfWeek: Number(d.dayOfWeek),
          isWeekend: Boolean(d.isWeekend),
          shiftId: d.shiftId && !d.isWeekend ? String(d.shiftId) : null,
        }))
      : [];

    const schedule = await prisma.shiftSchedule.create({
      data: {
        name: name.trim(),
        companyId,
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

    return NextResponse.json(schedule, { status: 201 });
  } catch (err: any) {
    console.error("POST shift-schedule error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create shift schedule." },
      { status: 500 }
    );
  }
}

