import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDailyAttendanceMetrics } from "@/lib/attendance";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "in"; // "in" or "out"

    const now = new Date();
    // Current time in HH:mm (24-hour)
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${hours}:${minutes}`;

    const dateKey = now.toISOString().slice(0, 10);
    const dateObj = new Date(`${dateKey}T00:00:00.000Z`);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { shift: true },
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

    const shiftStartTime = user.shift?.startTime || "09:00";
    const shiftEndTime = user.shift?.endTime || "18:00";

    const inTime = action === "in" ? currentTimeStr : existing?.inTime || null;
    const outTime = action === "out" ? currentTimeStr : existing?.outTime || null;

    const metrics = computeDailyAttendanceMetrics({
      inTime,
      outTime,
      shiftStartTime,
      shiftEndTime,
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
        overtimeMinutes: metrics.overtimeMinutes,
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
