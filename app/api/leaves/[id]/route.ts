import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";
import { sendLeaveDecisionEmail } from "@/lib/mail";
import { syncApprovedLeaveToAttendance, revertLeaveFromAttendance } from "@/lib/leave-sync";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, reviewNotes } = body || {};

    if (!status || !["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status ('APPROVED', 'REJECTED', or 'CANCELLED') is required." },
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

    // Tenant check: must be in same company or SUPER_ADMIN
    if (
      sessionUser.role !== "SUPER_ADMIN" &&
      leaveRequest.companyId !== sessionUser.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isApplicant = sessionUser.id === leaveRequest.userId;
    const isManager = isManagerOrAdmin(sessionUser.role) || sessionUser.role === "SUPER_ADMIN";

    // Permission check:
    // - Applicants can cancel their own leave request (status: CANCELLED)
    // - Managers/Admins can approve, reject, or cancel
    if (status === "CANCELLED") {
      if (!isApplicant && !isManager) {
        return NextResponse.json(
          { error: "You do not have permission to cancel this leave application." },
          { status: 403 }
        );
      }
    } else {
      if (!isManager) {
        return NextResponse.json(
          { error: "Only Admins and Managers can approve or reject leave applications." },
          { status: 403 }
        );
      }
    }

    // If it was already APPROVED and now being CANCELLED or REJECTED, revert Attendance records!
    if (leaveRequest.status === "APPROVED" && (status === "CANCELLED" || status === "REJECTED")) {
      await revertLeaveFromAttendance({
        userId: leaveRequest.userId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      });
    }

    // Update leave request status
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerId: isApplicant && status === "CANCELLED" ? leaveRequest.reviewerId : sessionUser.id,
        reviewedAt: new Date(),
        reviewNotes:
          reviewNotes?.trim() ||
          (isApplicant && status === "CANCELLED"
            ? "Cancelled by applicant."
            : status === "CANCELLED"
            ? "Cancelled by management."
            : null),
      },
    });

    // If newly APPROVED, automatically sync days to Attendance table!
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

    // Send decision/cancellation notification email to applicant (if not cancelled by applicant themselves)
    try {
      if (leaveRequest.user.email && (!isApplicant || status !== "CANCELLED")) {
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

        await sendLeaveDecisionEmail({
          to: leaveRequest.user.email,
          employeeName: leaveRequest.user.name,
          status,
          reviewerName: sessionUser.name,
          startDate: startFormatted,
          endDate: endFormatted,
          daysCount: leaveRequest.daysCount,
          leaveType: leaveRequest.leaveType,
          reviewNotes: reviewNotes?.trim() || null,
        });
      }
    } catch (err) {
      console.error("Error dispatching leave decision email:", err);
    }

    // Log leave decision activity
    const actionType =
      status === "APPROVED"
        ? "LEAVE_APPROVED"
        : status === "REJECTED"
        ? "LEAVE_REJECTED"
        : "LEAVE_CANCELLED";

    const desc =
      status === "APPROVED"
        ? `${sessionUser.name} approved leave request for ${leaveRequest.user.name}`
        : status === "REJECTED"
        ? `${sessionUser.name} rejected leave request for ${leaveRequest.user.name}`
        : `${sessionUser.name} cancelled leave request for ${leaveRequest.user.name}`;

    await logActivity({
      companyId: leaveRequest.companyId,
      userId: sessionUser.id,
      action: actionType,
      entityType: "LEAVE",
      entityId: id,
      description: desc,
      details: {
        status,
        applicantName: leaveRequest.user.name,
        applicantEmail: leaveRequest.user.email,
        reviewNotes: reviewNotes?.trim() || null,
        daysCount: leaveRequest.daysCount,
      },
    });

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
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

    const isApplicant = sessionUser.id === leaveRequest.userId;
    const isManager = isManagerOrAdmin(sessionUser.role) || sessionUser.role === "SUPER_ADMIN";

    if (!isApplicant && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If it was APPROVED, revert Attendance records before deleting
    if (leaveRequest.status === "APPROVED") {
      await revertLeaveFromAttendance({
        userId: leaveRequest.userId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      });
    }

    await prisma.leaveRequest.delete({
      where: { id },
    });

    await logActivity({
      companyId: leaveRequest.companyId,
      userId: sessionUser.id,
      action: "LEAVE_DELETED",
      entityType: "LEAVE",
      entityId: id,
      description: `${sessionUser.name} deleted leave request for ${leaveRequest.user?.name || "employee"}`,
    });

    return NextResponse.json({
      success: true,
      message: "Leave application deleted successfully.",
    });
  } catch (err: any) {
    console.error("DELETE /api/leaves/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete leave request." },
      { status: 500 }
    );
  }
}
