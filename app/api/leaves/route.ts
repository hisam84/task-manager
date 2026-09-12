import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLeaveApplicationEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isEmployee = sessionUser.role === "EMPLOYEE";
    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";

    const whereClause: any = {};

    if (isEmployee) {
      // Employees only view their own leave applications
      whereClause.userId = sessionUser.id;
    } else if (!isSuperAdmin) {
      // Company Admins / Managers view all leave applications in their company
      if (sessionUser.companyId) {
        whereClause.companyId = sessionUser.companyId;
      }
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            designation: true,
            department: true,
            departmentRel: { select: { id: true, name: true } },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(leaveRequests);
  } catch (err: any) {
    console.error("GET /api/leaves error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leave requests." },
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
    const { startDate, endDate, leaveType, reason } = body || {};

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required." },
        { status: 400 }
      );
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason || trimmedReason.length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid reason (at least 5 characters)." },
        { status: 400 }
      );
    }

    const startObj = new Date(`${startDate}T00:00:00.000Z`);
    const endObj = new Date(`${endDate}T00:00:00.000Z`);

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    if (endObj < startObj) {
      return NextResponse.json(
        { error: "End date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    // Calculate calendar days
    const diffMs = endObj.getTime() - startObj.getTime();
    const daysCount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Resolve company ID
    let companyId = sessionUser.companyId;
    if (!companyId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { companyId: true },
      });
      companyId = dbUser?.companyId || null;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Company association is required to submit a leave application." },
        { status: 400 }
      );
    }

    // Generate secure token for one-click email actions
    const actionToken = crypto.randomBytes(32).toString("hex");

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: sessionUser.id,
        companyId,
        startDate: startObj,
        endDate: endObj,
        daysCount,
        leaveType: leaveType || "CASUAL",
        reason: trimmedReason,
        status: "PENDING",
        actionToken,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            designation: true,
            department: true,
            departmentRel: { select: { name: true } },
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // Record Activity Log
    await logActivity({
      companyId,
      userId: sessionUser.id,
      action: "LEAVE_APPLY",
      entityType: "LEAVE",
      entityId: leaveRequest.id,
      description: `${sessionUser.name} applied for ${daysCount} day(s) ${leaveType || "CASUAL"} leave (${startDate} to ${endDate})`,
      details: {
        startDate,
        endDate,
        daysCount,
        leaveType: leaveType || "CASUAL",
        reason: trimmedReason,
      },
    });

    // Compute app URL for one-click action links in email
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const proto = forwardedProto || (req.url.startsWith("https") ? "https" : "http");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const origin = req.headers.get("origin");
    const computedAppUrl = origin || (host ? `${proto}://${host}` : undefined);

    // Fetch all Admins, Managers, and Super Admins to notify via email
    try {
      const companyAdminsAndManagers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ["ADMIN", "MANAGER", "Admin", "Manager", "admin", "manager"] },
          NOT: { id: sessionUser.id }, // Don't email oneself if admin applied
        },
        select: { id: true, email: true, name: true, role: true },
      });

      const superAdmins = await prisma.user.findMany({
        where: {
          role: { in: ["SUPER_ADMIN", "super_admin", "Super_Admin"] },
          NOT: { id: sessionUser.id },
        },
        select: { id: true, email: true, name: true, role: true },
      });

      const combinedUsers = [...companyAdminsAndManagers, ...superAdmins];
      const seenEmails = new Set<string>();
      const recipientEmails: string[] = [];

      for (const u of combinedUsers) {
        const clean = u.email?.trim();
        if (clean && clean.includes("@")) {
          const lower = clean.toLowerCase();
          if (!seenEmails.has(lower)) {
            seenEmails.add(lower);
            recipientEmails.push(clean);
          }
        }
      }

      if (recipientEmails.length > 0) {
        const startDateFormatted = startObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        const endDateFormatted = endObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });

        // Send email with direct 1-click Approve / Reject links
        // Await to ensure serverless runtime (e.g. Vercel) does not terminate mid-send
        try {
          await sendLeaveApplicationEmail({
            to: recipientEmails,
            applicantName: leaveRequest.user.name,
            applicantDesignation: leaveRequest.user.designation,
            applicantDepartment:
              leaveRequest.user.departmentRel?.name || leaveRequest.user.department,
            companyName: leaveRequest.company?.name || "Task Manager",
            startDate: startDateFormatted,
            endDate: endDateFormatted,
            daysCount,
            leaveType: leaveRequest.leaveType,
            reason: trimmedReason,
            actionToken,
            appUrl: computedAppUrl,
          });
        } catch (emailErr) {
          console.error("Failed to send leave notification email:", emailErr);
        }
      } else {
        console.warn(`[Leave Email] No admin, manager, or super-admin recipients found to notify for companyId: ${companyId}`);
      }
    } catch (mailErr) {
      console.error("Failed to query admins for leave notification:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Leave application submitted successfully and sent to managers.",
      leaveRequest,
    });
  } catch (err: any) {
    console.error("POST /api/leaves error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit leave request." },
      { status: 500 }
    );
  }
}
