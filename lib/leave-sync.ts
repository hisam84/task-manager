import { prisma } from "@/lib/prisma";

export async function syncApprovedLeaveToAttendance(leaveRequest: {
  userId: string;
  companyId: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  reason: string;
}) {
  const cur = new Date(leaveRequest.startDate);
  const end = new Date(leaveRequest.endDate);

  while (cur <= end) {
    const dateObj = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));
    const dayOfWeek = dateObj.getUTCDay(); // 5 = Friday
    const isWeekend = dayOfWeek === 5;

    // We mark working days as LEAVE in the attendance sheet
    // If it's Friday, retain WEEKEND status
    const attendanceStatus = isWeekend ? "WEEKEND" : "LEAVE";
    const noteText = `Approved Leave (${leaveRequest.leaveType}: ${leaveRequest.reason || "No reason specified"})`;

    await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: leaveRequest.userId,
          date: dateObj,
        },
      },
      update: {
        status: attendanceStatus,
        notes: noteText,
        lateMinutes: 0,
        latePenalty: 0,
        overtimeMinutes: 0,
        workingMinutes: 0,
      },
      create: {
        userId: leaveRequest.userId,
        companyId: leaveRequest.companyId,
        date: dateObj,
        status: attendanceStatus,
        notes: noteText,
        lateMinutes: 0,
        latePenalty: 0,
        overtimeMinutes: 0,
        workingMinutes: 0,
      },
    });

    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

export async function revertLeaveFromAttendance(leaveRequest: {
  userId: string;
  startDate: Date;
  endDate: Date;
}) {
  const cur = new Date(leaveRequest.startDate);
  const end = new Date(leaveRequest.endDate);

  while (cur <= end) {
    const dateObj = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: leaveRequest.userId,
          date: dateObj,
        },
      },
      select: { status: true, inTime: true },
    });

    if (existing && existing.status === "LEAVE") {
      if (!existing.inTime) {
        // If employee never clocked in on this day, remove the synthetic leave attendance record
        await prisma.attendance.delete({
          where: {
            userId_date: {
              userId: leaveRequest.userId,
              date: dateObj,
            },
          },
        });
      } else {
        // If they clocked in, restore to PRESENT
        await prisma.attendance.update({
          where: {
            userId_date: {
              userId: leaveRequest.userId,
              date: dateObj,
            },
          },
          data: {
            status: "PRESENT",
            notes: null,
          },
        });
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}
