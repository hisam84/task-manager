import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";
import { sendLeaveDecisionEmail } from "@/lib/mail";
import { syncApprovedLeaveToAttendance } from "@/lib/leave-sync";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role) && sessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Admins and Managers can review leave applications." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, reviewNotes } = body || {};

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status ('APPROVED' or 'REJECTED') is required." },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      leaveRequest.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update leave request status
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerId: sessionUser.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes?.trim() || null,
      },
    });

    // If APPROVED, automatically sync days to Attendance table!
    if (status === "APPROVED") {
      await syncApprovedLeaveToAttendance({
        userId: leaveRequest.userId,
        companyId: leaveRequest.companyId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        leaveType: leaveRequest.leaveType,
        reason: leaveRequest.reason,
      });
    }

    // Send decision notification email to applicant
    try {
      if (leaveRequest.user.email) {
        const startFormatted = leaveRequest.startDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        const endFormatted = leaveRequest.endDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });

        sendLeaveDecisionEmail({
          to: leaveRequest.user.email,
          employeeName: leaveRequest.user.name,
          status,
          reviewerName: sessionUser.name,
          startDate: startFormatted,
          endDate: endFormatted,
          daysCount: leaveRequest.daysCount,
          leaveType: leaveRequest.leaveType,
          reviewNotes: reviewNotes?.trim() || null,
        }).catch((e) => console.error("Leave decision email failed:", e));
      }
    } catch (err) {
      console.error("Error dispatching leave decision email:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()} successfully.`,
      leaveRequest: updated,
    });
  } catch (err: any) {
    console.error("PATCH /api/leaves/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update leave request." },
      { status: 500 }
    );
  }
}
