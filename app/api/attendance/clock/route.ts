import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDailyAttendanceMetrics, getEffectiveShiftForDate } from "@/lib/attendance";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "in"; // "in" or "out"
    const lateReason = typeof body?.lateReason === "string" ? body.lateReason.trim() : undefined;
    const lateInformed = typeof body?.lateInformed === "boolean" ? body.lateInformed : undefined;

    const now = new Date();
    // Current time in HH:mm (24-hour)
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${hours}:${minutes}`;

    const dateKey = now.toISOString().slice(0, 10);
    const dateObj = new Date(`${dateKey}T00:00:00.000Z`);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        shift: true,
        shiftSchedule: {
          include: {
            days: {
              include: { shift: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const companyId = user.companyId || sessionUser.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company not found." }, { status: 400 });
    }

    // Check existing today record
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: dateObj,
        },
      },
    });

    // Check if today is a company holiday
    const holiday = await prisma.holiday.findFirst({
      where: {
        companyId,
        date: dateObj,
      },
    });
    const isHoliday = !!holiday;

    const effectiveShift = getEffectiveShiftForDate(user, dateObj);
    const shiftStartTime = effectiveShift.shiftStartTime;
    const shiftEndTime = effectiveShift.shiftEndTime;
    const isWeekend = effectiveShift.isWeekend;

    const inTime = action === "in" ? currentTimeStr : existing?.inTime || null;
    const outTime = action === "out" ? currentTimeStr : existing?.outTime || null;

    const effectiveLateInformed =
      lateInformed !== undefined ? lateInformed : existing?.lateInformed || false;
    const effectiveLateReason =
      lateReason !== undefined ? lateReason : existing?.lateReason || null;

    const metrics = computeDailyAttendanceMetrics({
      inTime,
      outTime,
      isHoliday,
      isWeekend,
      shiftStartTime,
      shiftEndTime,
      lateInformed: effectiveLateInformed,
    });

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: dateObj,
        },
      },
      update: {
        inTime,
        outTime,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        latePenalty: metrics.latePenalty,
        lateReason: effectiveLateReason,
        lateInformed: effectiveLateInformed,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
      },
      create: {
        userId: user.id,
        companyId,
        date: dateObj,
        inTime,
        outTime,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        latePenalty: metrics.latePenalty,
        lateReason: effectiveLateReason,
        lateInformed: effectiveLateInformed,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
      },
    });

    // Record Activity Log
    await logActivity({
      companyId,
      userId: user.id,
      action: action === "in" ? "ATTENDANCE_CHECKIN" : "ATTENDANCE_CHECKOUT",
      entityType: "ATTENDANCE",
      entityId: attendance.id,
      description: `${user.name} clocked ${action === "in" ? "IN" : "OUT"} at ${currentTimeStr}`,
      details: {
        action,
        time: currentTimeStr,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        workingMinutes: metrics.workingMinutes,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      time: currentTimeStr,
      attendance,
    });
  } catch (err: any) {
    console.error("POST clock error:", err);
    return NextResponse.json(
      { error: err.message || "Clock in/out failed." },
      { status: 500 }
    );
  }
}
