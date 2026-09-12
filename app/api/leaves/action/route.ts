import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncApprovedLeaveToAttendance } from "@/lib/leave-sync";
import { sendLeaveDecisionEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action"); // "approve" | "reject"

    if (!token) {
      return new NextResponse(renderHtmlResult({
        success: false,
        title: "Missing Token",
        message: "The link you followed is missing a valid action token.",
      }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (!action || !["approve", "reject"].includes(action.toLowerCase())) {
      return new NextResponse(renderHtmlResult({
        success: false,
        title: "Invalid Action",
        message: "The action specified in the link is invalid.",
      }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { actionToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            department: true,
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
      return new NextResponse(renderHtmlResult({
        success: false,
        title: "Request Not Found",
        message: "This leave request could not be found or the link has expired.",
      }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const startDateFormatted = leaveRequest.startDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const endDateFormatted = leaveRequest.endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    // If already reviewed
    if (leaveRequest.status !== "PENDING") {
      const isAlreadyApproved = leaveRequest.status === "APPROVED";
      return new NextResponse(renderHtmlResult({
        success: true,
        alreadyProcessed: true,
        title: `Already ${leaveRequest.status}`,
        message: `This leave request was already marked as ${leaveRequest.status.toLowerCase()} on ${leaveRequest.reviewedAt ? new Date(leaveRequest.reviewedAt).toLocaleDateString() : "earlier"}.`,
        details: {
          applicant: leaveRequest.user.name,
          dates: `${startDateFormatted} to ${endDateFormatted} (${leaveRequest.daysCount} days)`,
          status: leaveRequest.status,
        },
      }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const isApprove = action.toLowerCase() === "approve";
    const newStatus = isApprove ? "APPROVED" : "REJECTED";

    // Update database
    await prisma.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewNotes: "Actioned directly via email link",
      },
    });

    await logActivity({
      companyId: leaveRequest.companyId,
      action: isApprove ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      entityType: "LEAVE",
      entityId: leaveRequest.id,
      description: `${isApprove ? "Approved" : "Rejected"} leave request for ${leaveRequest.user.name} via email action link`,
      details: {
        status: newStatus,
        viaEmail: true,
      },
    });

    // If approved, automatically sync to attendance sheet
    if (isApprove) {
      await syncApprovedLeaveToAttendance({
        userId: leaveRequest.userId,
        companyId: leaveRequest.companyId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        leaveType: leaveRequest.leaveType,
        reason: leaveRequest.reason,
      });
    }

    // Notify employee of the decision
    try {
      if (leaveRequest.user.email) {
        await sendLeaveDecisionEmail({
          to: leaveRequest.user.email,
          employeeName: leaveRequest.user.name,
          status: newStatus,
          reviewerName: "Company Management",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          daysCount: leaveRequest.daysCount,
          leaveType: leaveRequest.leaveType,
          reviewNotes: "Decision submitted via email link.",
        });
      }
    } catch (mailErr) {
      console.error("Failed to notify employee:", mailErr);
    }

    return new NextResponse(renderHtmlResult({
      success: true,
      title: isApprove ? "Leave Application Approved" : "Leave Application Rejected",
      message: isApprove
        ? `You have successfully approved ${leaveRequest.user.name}'s leave application. The attendance sheet has been automatically updated with Leave status.`
        : `You have rejected ${leaveRequest.user.name}'s leave application. A notification has been sent to the employee.`,
      details: {
        applicant: leaveRequest.user.name,
        dates: `${startDateFormatted} to ${endDateFormatted} (${leaveRequest.daysCount} days)`,
        status: newStatus,
      },
    }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    console.error("GET /api/leaves/action error:", err);
    return new NextResponse(renderHtmlResult({
      success: false,
      title: "Unexpected Error",
      message: err.message || "An unexpected error occurred while processing this action.",
    }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

function renderHtmlResult({
  success,
  alreadyProcessed,
  title,
  message,
  details,
}: {
  success: boolean;
  alreadyProcessed?: boolean;
  title: string;
  message: string;
  details?: {
    applicant: string;
    dates: string;
    status: string;
  };
}) {
  const isApproved = details?.status === "APPROVED";
  const isRejected = details?.status === "REJECTED";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Task Manager</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            padding: 36px 32px;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          }
          .icon-badge {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            margin: 0 auto 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
          }
          .icon-success {
            background-color: #ecfdf5;
            color: #059669;
            border: 2px solid #a7f3d0;
          }
          .icon-danger {
            background-color: #fef2f2;
            color: #dc2626;
            border: 2px solid #fecaca;
          }
          .icon-info {
            background-color: #eff6ff;
            color: #2563eb;
            border: 2px solid #bfdbfe;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.3px;
            margin-bottom: 12px;
            color: #0f172a;
          }
          p.desc {
            font-size: 14px;
            line-height: 22px;
            color: #475569;
            margin-bottom: 24px;
          }
          .details-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 13px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; font-weight: 500; }
          .val { color: #0f172a; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
          }
          .badge-approved { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .badge-rejected { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
          .badge-pending { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .btn {
            display: inline-block;
            width: 100%;
            background-color: #4f46e5;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.15s ease;
          }
          .btn:hover { background-color: #4338ca; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge ${
            !success
              ? "icon-danger"
              : isApproved
              ? "icon-success"
              : isRejected
              ? "icon-danger"
              : "icon-info"
          }">
            ${!success ? "&#10007;" : isApproved ? "&#10003;" : isRejected ? "&#10007;" : "&#8505;"}
          </div>

          <h1>${title}</h1>
          <p class="desc">${message}</p>

          ${
            details
              ? `
            <div class="details-box">
              <div class="row">
                <span class="label">Employee:</span>
                <span class="val">${details.applicant}</span>
              </div>
              <div class="row">
                <span class="label">Period:</span>
                <span class="val">${details.dates}</span>
              </div>
              <div class="row">
                <span class="label">Status:</span>
                <span class="val">
                  <span class="badge ${
                    details.status === "APPROVED"
                      ? "badge-approved"
                      : details.status === "REJECTED"
                      ? "badge-rejected"
                      : "badge-pending"
                  }">
                    ${details.status}
                  </span>
                </span>
              </div>
            </div>
          `
              : ""
          }

          <a href="/attendance" class="btn">Go to Attendance Sheet</a>
        </div>
      </body>
    </html>
  `;
}
