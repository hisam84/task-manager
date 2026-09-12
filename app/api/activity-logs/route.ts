import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";
    const canView = isManagerOrAdmin(sessionUser.role) || isSuperAdmin;

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden. Only Admins and Managers can view activity logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || "ALL";
    const userId = searchParams.get("userId") || "ALL";
    const q = searchParams.get("q")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Tenant scoping
    let targetCompanyId = sessionUser.companyId;
    if (isSuperAdmin && searchParams.get("companyId")) {
      targetCompanyId = searchParams.get("companyId");
    }

    const where: any = {};
    if (targetCompanyId) {
      where.companyId = targetCompanyId;
    }

    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }

    if (userId && userId !== "ALL") {
      where.userId = userId;
    }

    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { action: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, totalCount, todayCount, taskCount, leaveCount, attendanceCount, userCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              designation: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
      // Today count
      prisma.activityLog.count({
        where: {
          ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Task count
      prisma.activityLog.count({
        where: {
          ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
          entityType: "TASK",
        },
      }),
      // Leave count
      prisma.activityLog.count({
        where: {
          ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
          entityType: "LEAVE",
        },
      }),
      // Attendance count
      prisma.activityLog.count({
        where: {
          ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
          entityType: "ATTENDANCE",
        },
      }),
      // User count
      prisma.activityLog.count({
        where: {
          ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
          entityType: "USER",
        },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      metrics: {
        todayCount,
        taskCount,
        leaveCount,
        attendanceCount,
        userCount,
        totalCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/activity-logs error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch activity logs." },
      { status: 500 }
    );
  }
}
