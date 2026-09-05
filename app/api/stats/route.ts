import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { canManageCompanies, isCompanyAdmin, isEmployee } from "@/lib/domain";
import { summarizeTasks } from "@/lib/task-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    if (canManageCompanies(user.role)) {
      const [companies, activeCompanies, employees, departments, tasks] = await Promise.all([
        prisma.company.count(),
        prisma.company.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: "EMPLOYEE" } }),
        prisma.department.count(),
        prisma.task.findMany({
          select: { status: true, dueDate: true, completedAt: true, createdAt: true },
          take: 5000,
        }),
      ]);
      return NextResponse.json({
        scope: "platform",
        totalCompanies: companies,
        activeCompanies,
        totalEmployees: employees,
        totalDepartments: departments,
        ...summarizeTasks(tasks),
      });
    }

    if (!user.companyId) return jsonError("No company assigned", 403);

    const taskWhere = isEmployee(user.role)
      ? { companyId: user.companyId, assigneeId: user.id }
      : { companyId: user.companyId };

    const [employees, departments, tasks, upcoming] = await Promise.all([
      isCompanyAdmin(user.role)
        ? prisma.user.count({ where: { companyId: user.companyId, role: "EMPLOYEE" } })
        : Promise.resolve(0),
      isCompanyAdmin(user.role)
        ? prisma.department.count({ where: { companyId: user.companyId } })
        : Promise.resolve(0),
      prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          progress: true,
          isSelfTask: true,
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.task.findMany({
        where: {
          ...taskWhere,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { gte: new Date() },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          assignee: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
    ]);

    const summary = summarizeTasks(tasks);
    const recent = tasks.slice(0, 8);

    return NextResponse.json({
      scope: isEmployee(user.role) ? "employee" : "company",
      totalEmployees: employees,
      totalDepartments: departments,
      ...summary,
      upcomingDeadlines: upcoming,
      recentTasks: recent,
    });
  } catch (error) {
    return apiError(error, "Failed to load statistics");
  }
}
