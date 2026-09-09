import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin, canViewPenaltyAndOvertime } from "@/lib/access";
import { computeDailyAttendanceMetrics } from "@/lib/attendance";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId") || sessionUser.id;
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10); // 1-12

    // Check permissions
    if (sessionUser.role === "EMPLOYEE" && requestedUserId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch target user with shift
    const targetUser = await prisma.user.findUnique({
      where: { id: requestedUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: true,
        departmentRel: { select: { id: true, name: true } },
        order: true,
        companyId: true,
        company: { select: { id: true, name: true, enableLatePenalty: true } },
        shiftId: true,
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            graceMinutes: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      targetUser.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = targetUser.companyId || sessionUser.companyId;

    // Date range for the requested month
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // Fetch existing attendance records for user
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: targetUser.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Fetch company holidays in this month
    const holidays = companyId
      ? await prisma.holiday.findMany({
          where: {
            companyId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        })
      : [];

    const holidayMap = new Map<string, string>();
    holidays.forEach((h) => {
      const dayKey = h.date.toISOString().slice(0, 10);
      holidayMap.set(dayKey, h.name);
    });

    const attendanceMap = new Map<string, any>();
    attendances.forEach((a) => {
      const dayKey = a.date.toISOString().slice(0, 10);
      attendanceMap.set(dayKey, a);
    });

    // Build day-by-day records
    const dailyRecords = [];
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let leaveCount = 0;
    let weekendCount = 0;
    let totalLateMinutes = 0;
    let totalLatePenalty = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkingMinutes = 0;

    const enableLatePenalty = targetUser.company?.enableLatePenalty ?? false;
    const canViewFinesAndOvertime = canViewPenaltyAndOvertime(sessionUser.role);

    const shiftStartTime = targetUser.shift?.startTime || "09:00";
    const shiftEndTime = targetUser.shift?.endTime || "18:00";

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dateKey = dateObj.toISOString().slice(0, 10);
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const isWeekend = dayOfWeek === 5; // Friday weekend standard in Bangladesh/local setup

      const holidayName = holidayMap.get(dateKey) || null;
      const isHoliday = !!holidayName;

      const record = attendanceMap.get(dateKey);

      let status = "ABSENT";
      let inTime = null;
      let outTime = null;
      let lateMinutes = 0;
      let latePenalty = 0;
      let overtimeMinutes = 0;
      let workingMinutes = 0;
      let notes = null;
      let attendanceId = null;

      if (record) {
        attendanceId = record.id;
        inTime = record.inTime;
        outTime = record.outTime;
        notes = record.notes;

        if (inTime || outTime) {
          const isLeaveRecord = record.status === "LEAVE";
          const m = computeDailyAttendanceMetrics({
            inTime,
            outTime,
            isHoliday,
            isLeave: isLeaveRecord,
            isWeekend,
            shiftStartTime,
            shiftEndTime,
          });

          status = isLeaveRecord && !inTime ? "LEAVE" : m.status;
          lateMinutes = m.lateMinutes;
          latePenalty =
            enableLatePenalty && status !== "HOLIDAY" && status !== "LEAVE" && status !== "WEEKEND"
              ? m.latePenalty
              : 0;
          overtimeMinutes = m.overtimeMinutes;
          workingMinutes = m.workingMinutes;
        } else {
          if (record.status === "LEAVE") {
            status = "LEAVE";
          } else if (isHoliday) {
            status = "HOLIDAY";
          } else if (isWeekend) {
            status = "WEEKEND";
          } else {
            status = record.status || "ABSENT";
          }
          lateMinutes = 0;
          latePenalty = 0;
          overtimeMinutes = 0;
          workingMinutes = 0;
        }
      } else {
        if (isHoliday) {
          status = "HOLIDAY";
        } else if (isWeekend) {
          status = "WEEKEND";
        } else {
          status = "ABSENT";
        }
      }

      if (status === "PRESENT") presentCount++;
      else if (status === "LATE") {
        lateCount++;
        presentCount++; // late employees are present
      } else if (status === "HOLIDAY") holidayCount++;
      else if (status === "LEAVE") leaveCount++;
      else if (status === "WEEKEND") weekendCount++;
      else if (status === "ABSENT") absentCount++;

      totalLateMinutes += lateMinutes;
      totalLatePenalty += latePenalty;
      totalOvertimeMinutes += overtimeMinutes;
      totalWorkingMinutes += workingMinutes;

      dailyRecords.push({
        id: attendanceId,
        date: dateKey,
        day,
        dayOfWeek,
        isWeekend,
        isHoliday: isHoliday || status === "HOLIDAY",
        isLeave: status === "LEAVE",
        holidayName,
        status,
        inTime,
        outTime,
        lateMinutes,
        latePenalty: canViewFinesAndOvertime ? latePenalty : 0,
        overtimeMinutes: canViewFinesAndOvertime ? overtimeMinutes : 0,
        workingMinutes,
        notes,
      });
    }

    return NextResponse.json({
      employee: targetUser,
      enableLatePenalty: canViewFinesAndOvertime ? enableLatePenalty : false,
      year,
      month,
      daysInMonth,
      summary: {
        totalDays: daysInMonth,
        presentCount,
        lateCount,
        absentCount,
        holidayCount,
        leaveCount,
        weekendCount,
        totalLateMinutes,
        totalLatePenalty: canViewFinesAndOvertime && enableLatePenalty ? totalLatePenalty : 0,
        totalOvertimeMinutes: canViewFinesAndOvertime ? totalOvertimeMinutes : 0,
        totalWorkingMinutes,
      },
      records: dailyRecords,
    });
  } catch (err: any) {
    console.error("GET attendance error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch attendance." },
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

    const body = await req.json();
    const {
      userId: requestedUserId,
      date,
      inTime,
      outTime,
      status: explicitStatus,
      notes,
    } = body || {};

    const targetUserId = requestedUserId || sessionUser.id;

    if (sessionUser.role === "EMPLOYEE" && targetUserId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    // Normalize date to UTC midnight
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    // Fetch user and shift
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        shift: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const companyId = targetUser.companyId || sessionUser.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is missing." }, { status: 400 });
    }

    // Check if it's marked as Holiday or Leave
    const isHoliday = explicitStatus === "HOLIDAY";
    const isLeave = explicitStatus === "LEAVE";
    const isWeekend = explicitStatus === "WEEKEND";

    const shiftStartTime = targetUser.shift?.startTime || "09:00";
    const shiftEndTime = targetUser.shift?.endTime || "18:00";

    const metrics = computeDailyAttendanceMetrics({
      inTime,
      outTime,
      isHoliday,
      isLeave,
      isWeekend,
      shiftStartTime,
      shiftEndTime,
    });

    const finalStatus =
      explicitStatus && explicitStatus !== "PRESENT" && explicitStatus !== "LATE"
        ? explicitStatus
        : metrics.status;

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: targetUserId,
          date: dateObj,
        },
      },
      update: {
        inTime: inTime || null,
        outTime: outTime || null,
        status: finalStatus,
        lateMinutes: metrics.lateMinutes,
        latePenalty: metrics.latePenalty,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
        notes: notes ?? undefined,
      },
      create: {
        userId: targetUserId,
        companyId,
        date: dateObj,
        inTime: inTime || null,
        outTime: outTime || null,
        status: finalStatus,
        lateMinutes: metrics.lateMinutes,
        latePenalty: metrics.latePenalty,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
        notes: notes ?? null,
      },
    });

    const canViewFinesAndOvertime = canViewPenaltyAndOvertime(sessionUser.role);
    return NextResponse.json({
      ...attendance,
      latePenalty: canViewFinesAndOvertime ? attendance.latePenalty : 0,
      overtimeMinutes: canViewFinesAndOvertime ? attendance.overtimeMinutes : 0,
    });
  } catch (err: any) {
    console.error("POST attendance error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update attendance." },
      { status: 500 }
    );
  }
}
