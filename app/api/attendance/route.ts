import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin, canViewPenaltyAndOvertime } from "@/lib/access";
import { computeDailyAttendanceMetrics, getEffectiveShiftForDate } from "@/lib/attendance";

function normalizeTime(t?: string | null): string | null {
  if (!t || typeof t !== "string") return null;
  const trimmed = t.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return trimmed;
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId") || sessionUser.id;
    const now = new Date();

    const parsedYear = parseInt(searchParams.get("year") || "", 10);
    const parsedMonth = parseInt(searchParams.get("month") || "", 10);
    const year = !isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
    const month = !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : now.getMonth() + 1;

    // Check permissions: regular employees can only view their own attendance
    if (sessionUser.role === "EMPLOYEE" && requestedUserId !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch target user with shift and company settings
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
        shiftScheduleId: true,
        shiftSchedule: {
          include: {
            days: {
              include: { shift: true },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Cross-tenant permission check
    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      targetUser.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = targetUser.companyId || sessionUser.companyId;

    // Safe UTC date range for the requested month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
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

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dateKey = dateObj.toISOString().slice(0, 10);
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

      const dayShift = getEffectiveShiftForDate(targetUser, dateObj);
      const isWeekend = dayShift.isWeekend;
      const shiftStartTime = dayShift.shiftStartTime;
      const shiftEndTime = dayShift.shiftEndTime;

      const holidayName = holidayMap.get(dateKey) || null;
      const isCompanyHoliday = !!holidayName;

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
      let lateReason = null;
      let lateInformed = false;
      let isHolidayOverridden = false;

      if (record) {
        attendanceId = record.id;
        inTime = normalizeTime(record.inTime);
        outTime = normalizeTime(record.outTime);
        notes = record.notes;
        lateReason = record.lateReason;
        lateInformed = record.lateInformed || false;

        const isLeaveRecord = record.status === "LEAVE";
        const hasExplicitNonHoliday =
          Boolean(record.status && record.status !== "HOLIDAY");

        // Check if company holiday is overridden for this specific employee
        if (isCompanyHoliday && hasExplicitNonHoliday) {
          isHolidayOverridden = true;
        }

        // For this employee, is it effectively a holiday?
        // Default is company holiday UNLESS this employee's record explicitly overrides it to a non-holiday status.
        const effectiveIsHoliday = record.status === "HOLIDAY"
          ? true
          : hasExplicitNonHoliday
          ? false
          : isCompanyHoliday;

        if (inTime || outTime) {
          const m = computeDailyAttendanceMetrics({
            inTime,
            outTime,
            isHoliday: effectiveIsHoliday,
            isLeave: isLeaveRecord,
            isWeekend,
            shiftStartTime,
            shiftEndTime,
            lateInformed,
          });

          if (hasExplicitNonHoliday) {
            status = record.status === "PRESENT" && m.status === "LATE" ? "LATE" : record.status;
          } else {
            status = isLeaveRecord && !inTime ? "LEAVE" : m.status;
          }
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
          } else if (record.status === "HOLIDAY") {
            status = "HOLIDAY";
          } else if (hasExplicitNonHoliday) {
            // Explicit override by admin (e.g. PRESENT, ABSENT)
            status = record.status;
          } else if (isCompanyHoliday) {
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
        // By default:
        if (isCompanyHoliday) {
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
        presentCount++; // late employees are counted as present
      } else if (status === "HOLIDAY") holidayCount++;
      else if (status === "LEAVE") leaveCount++;
      else if (status === "WEEKEND") weekendCount++;
      else if (status === "ABSENT") absentCount++;

      totalLateMinutes += lateMinutes;
      totalLatePenalty += latePenalty;
      totalOvertimeMinutes += overtimeMinutes;
      totalWorkingMinutes += workingMinutes;

      const isEffectiveHoliday = status === "HOLIDAY";

      dailyRecords.push({
        id: attendanceId,
        date: dateKey,
        day,
        dayOfWeek,
        isWeekend,
        isHoliday: isEffectiveHoliday,
        isCompanyHoliday,
        isHolidayOverridden,
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
        lateReason,
        lateInformed,
        shiftName: dayShift.shiftName,
        shiftStartTime: dayShift.shiftStartTime,
        shiftEndTime: dayShift.shiftEndTime,
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

    // Role check: Only Managers, Admins, and Super Admins can manually edit/update attendance records
    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json(
        { error: "Forbidden. Only managers and admins can manually update attendance records." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      userId: requestedUserId,
      date,
      inTime,
      outTime,
      status: explicitStatus,
      notes,
      lateReason,
      lateInformed,
    } = body || {};

    const targetUserId = requestedUserId || sessionUser.id;

    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    // Safely normalize date to UTC midnight (handles ISO format or YYYY-MM-DD)
    const cleanDateStr = String(date).split("T")[0];
    const dateObj = new Date(`${cleanDateStr}T00:00:00.000Z`);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    // Fetch target user with company and shift schedule
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            enableLatePenalty: true,
          },
        },
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

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Cross-tenant permission check
    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      targetUser.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = targetUser.companyId || sessionUser.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is missing." }, { status: 400 });
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: targetUserId,
          date: dateObj,
        },
      },
    });

    const effectiveLateInformed =
      lateInformed !== undefined ? Boolean(lateInformed) : existing?.lateInformed || false;
    const effectiveLateReason =
      lateReason !== undefined ? (lateReason?.trim() || null) : existing?.lateReason || null;
    const effectiveNotes = notes !== undefined ? (notes?.trim() || null) : existing?.notes || null;

    const normalizedInTime = normalizeTime(inTime);
    const normalizedOutTime = normalizeTime(outTime);

    // Determine holiday and leave status
    let isHoliday = explicitStatus === "HOLIDAY";
    let isLeave = explicitStatus === "LEAVE";

    if (!explicitStatus) {
      if (existing?.status === "HOLIDAY") {
        isHoliday = true;
      } else if (existing?.status === "LEAVE") {
        isLeave = true;
      } else if (!existing) {
        const companyHoliday = await prisma.holiday.findFirst({
          where: { companyId, date: dateObj },
        });
        if (companyHoliday) {
          isHoliday = true;
        }
      }
    }

    const effectiveShift = getEffectiveShiftForDate(targetUser, dateObj);
    const isWeekend = explicitStatus === "WEEKEND" || effectiveShift.isWeekend;
    const shiftStartTime = effectiveShift.shiftStartTime;
    const shiftEndTime = effectiveShift.shiftEndTime;

    const metrics = computeDailyAttendanceMetrics({
      inTime: normalizedInTime,
      outTime: normalizedOutTime,
      isHoliday,
      isLeave,
      isWeekend,
      shiftStartTime,
      shiftEndTime,
      lateInformed: effectiveLateInformed,
    });

    const finalStatus = explicitStatus
      ? explicitStatus === "PRESENT" && (normalizedInTime || normalizedOutTime) && metrics.status === "LATE"
        ? "LATE"
        : explicitStatus
      : metrics.status;

    const enableLatePenalty = targetUser.company?.enableLatePenalty ?? false;
    const finalLatePenalty =
      enableLatePenalty && finalStatus !== "HOLIDAY" && finalStatus !== "LEAVE" && finalStatus !== "WEEKEND"
        ? metrics.latePenalty
        : 0;

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: targetUserId,
          date: dateObj,
        },
      },
      update: {
        inTime: normalizedInTime || null,
        outTime: normalizedOutTime || null,
        status: finalStatus,
        lateMinutes: metrics.lateMinutes,
        latePenalty: finalLatePenalty,
        lateReason: effectiveLateReason,
        lateInformed: effectiveLateInformed,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
        notes: effectiveNotes,
      },
      create: {
        userId: targetUserId,
        companyId,
        date: dateObj,
        inTime: normalizedInTime || null,
        outTime: normalizedOutTime || null,
        status: finalStatus,
        lateMinutes: metrics.lateMinutes,
        latePenalty: finalLatePenalty,
        lateReason: effectiveLateReason,
        lateInformed: effectiveLateInformed,
        overtimeMinutes: metrics.overtimeMinutes,
        workingMinutes: metrics.workingMinutes,
        notes: effectiveNotes,
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
