import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCompanyId = searchParams.get("companyId");
    const now = new Date();

    // 1. SUPER ADMIN REPORTS
    if (sessionUser.role === "SUPER_ADMIN") {
      const [totalCompanies, activeCompanies, totalUsers, totalTasks, completedTasks, companiesList] =
        await Promise.all([
          prisma.company.count(),
          prisma.company.count({ where: { isActive: true } }),
          prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
          prisma.task.count(),
          prisma.task.count({ where: { status: "DONE" } }),
          prisma.company.findMany({
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              createdAt: true,
              _count: {
                select: { users: true, tasks: true, departments: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

      return NextResponse.json({
        role: "SUPER_ADMIN",
        metrics: {
          totalCompanies,
          activeCompanies,
          inactiveCompanies: totalCompanies - activeCompanies,
          totalUsers,
          totalTasks,
          completedTasks,
          overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        companiesList: companiesList.map((c) => ({
          ...c,
          userCount: c._count.users,
          taskCount: c._count.tasks,
          departmentCount: c._count.departments,
        })),
      });
    }

    // Target company ID for ADMIN or EMPLOYEE
    const companyId = sessionUser.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company ID missing in session." }, { status: 400 });
    }

    // 2. COMPANY ADMIN REPORTS
    if (sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER") {
      const [company, employees, tasks, departments] = await Promise.all([
        prisma.company.findUnique({ where: { id: companyId } }),
        prisma.user.findMany({
          where: { companyId, role: { not: "SUPER_ADMIN" } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            departmentRel: { select: { name: true } },
            assignedTasks: {
              select: { id: true, status: true, dueDate: true, priority: true },
            },
          },
        }),
        prisma.task.findMany({
          where: { companyId },
          select: { id: true, status: true, priority: true, dueDate: true },
        }),
        prisma.department.findMany({
          where: { companyId },
          select: { id: true, name: true, _count: { select: { users: true, tasks: true } } },
        }),
      ]);

      const statusBreakdown = {
        TODO: tasks.filter((t) => t.status === "TODO").length,
        IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
        IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
        DONE: tasks.filter((t) => t.status === "DONE").length,
      };

      const priorityBreakdown = {
        LOW: tasks.filter((t) => t.priority === "LOW").length,
        MEDIUM: tasks.filter((t) => t.priority === "MEDIUM").length,
        HIGH: tasks.filter((t) => t.priority === "HIGH").length,
        URGENT: tasks.filter((t) => t.priority === "URGENT").length,
      };

      const employeeMatrix = employees.map((emp) => {
        const total = emp.assignedTasks.length;
        const completed = emp.assignedTasks.filter((t) => t.status === "DONE").length;
        const inProgress = emp.assignedTasks.filter((t) => t.status === "IN_PROGRESS").length;
        const pending = emp.assignedTasks.filter((t) => t.status === "TODO" || t.status === "IN_REVIEW").length;
        const overdue = emp.assignedTasks.filter(
          (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
        ).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.departmentRel?.name || emp.department || "General",
          totalTasks: total,
          completed,
          inProgress,
          pending,
          overdue,
          completionRate,
        };
      });

      return NextResponse.json({
        role: "ADMIN",
        companyName: company?.name || "Company",
        metrics: {
          totalEmployees: employees.length,
          totalDepartments: departments.length,
          totalTasks: tasks.length,
          completedTasks: statusBreakdown.DONE,
          overallCompletionRate:
            tasks.length > 0 ? Math.round((statusBreakdown.DONE / tasks.length) * 100) : 0,
        },
        statusBreakdown,
        priorityBreakdown,
        departmentsSummary: departments.map((d) => ({
          id: d.id,
          name: d.name,
          userCount: d._count.users,
          taskCount: d._count.tasks,
        })),
        employeeMatrix,
      });
    }

    // 3. EMPLOYEE PERSONAL REPORTS
    const myTasks = await prisma.task.findMany({
      where: {
        companyId,
        OR: [{ assigneeId: sessionUser.id }, { creatorId: sessionUser.id }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        creatorId: true,
        assigneeId: true,
      },
      orderBy: { dueDate: "asc" },
    });

    const totalAssigned = myTasks.length;
    const completed = myTasks.filter((t) => t.status === "DONE").length;
    const inProgress = myTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const inReview = myTasks.filter((t) => t.status === "IN_REVIEW").length;
    const todo = myTasks.filter((t) => t.status === "TODO").length;
    const overdue = myTasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
    ).length;
    const selfCreated = myTasks.filter((t) => t.creatorId === sessionUser.id).length;

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    const upcomingDeadlines = myTasks
      .filter((t) => t.status !== "DONE" && t.dueDate)
      .slice(0, 5);

    return NextResponse.json({
      role: "EMPLOYEE",
      userName: sessionUser.name,
      metrics: {
        totalAssigned,
        completed,
        inProgress,
        inReview,
        todo,
        overdue,
        selfCreated,
        completionRate,
      },
      statusBreakdown: {
        TODO: todo,
        IN_PROGRESS: inProgress,
        IN_REVIEW: inReview,
        DONE: completed,
      },
      upcomingDeadlines,
    });
  } catch (err: any) {
    console.error("GET reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report analytics." },
      { status: 500 }
    );
  }
}
