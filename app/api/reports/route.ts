import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, jsonError } from "@/lib/http";
import { isCompanyAdmin, isEmployee } from "@/lib/domain";
import { summarizeTasks } from "@/lib/task-stats";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!user.companyId) return jsonError("No company assigned", 403);

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const format = searchParams.get("format");

    const scopedEmployeeId = isEmployee(user.role) ? user.id : employeeId;

    const where: Prisma.TaskWhereInput = {
      companyId: user.companyId,
      ...(scopedEmployeeId ? { assigneeId: scopedEmployeeId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(priority ? { priority } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    if (status === "OVERDUE") {
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      where.dueDate = { lt: new Date() };
    } else if (status) {
      where.status = status;
    }

    if (isEmployee(user.role)) {
      const tasks = await prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          progress: true,
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      const summary = summarizeTasks(tasks);
      const byMonth = new Map<string, { created: number; completed: number }>();
      for (const task of tasks) {
        const key = task.createdAt.toISOString().slice(0, 7);
        const bucket = byMonth.get(key) ?? { created: 0, completed: 0 };
        bucket.created += 1;
        if (task.status === "COMPLETED") bucket.completed += 1;
        byMonth.set(key, bucket);
      }
      return NextResponse.json({
        scope: "employee",
        summary,
        activity: [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, counts]) => ({ month, ...counts })),
        tasks,
      });
    }

    if (!isCompanyAdmin(user.role)) return jsonError("Forbidden", 403);

    const employees = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: "EMPLOYEE",
        ...(departmentId ? { departmentId } : {}),
        ...(scopedEmployeeId ? { id: scopedEmployeeId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        assignedTasks: {
          where,
          select: { status: true, dueDate: true, completedAt: true, createdAt: true, priority: true },
        },
      },
      take: 200,
    });

    const rows = employees.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      email: emp.email,
      department: emp.department?.name ?? "Unassigned",
      departmentId: emp.department?.id ?? null,
      ...summarizeTasks(emp.assignedTasks),
    }));

    const allTasks = employees.flatMap((emp) => emp.assignedTasks);
    const summary = summarizeTasks(allTasks);

    if (format === "csv") {
      const header = [
        "Employee Name",
        "Department",
        "Total Tasks",
        "Pending",
        "In Progress",
        "Completed",
        "Overdue",
        "Completion Rate",
        "Avg Completion Hours",
      ];
      const lines = [
        header.join(","),
        ...rows.map((row) =>
          [
            csv(row.employeeName),
            csv(row.department),
            row.total,
            row.pending,
            row.inProgress,
            row.completed,
            row.overdue,
            row.completionRate,
            row.avgCompletionHours ?? "",
          ].join(",")
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=employee-task-report.csv",
        },
      });
    }

    return NextResponse.json({
      scope: "company",
      summary,
      employees: rows,
      charts: {
        byStatus: [
          { label: "Pending", value: summary.pending },
          { label: "In Progress", value: summary.inProgress },
          { label: "Completed", value: summary.completed },
          { label: "Overdue", value: summary.overdue },
        ],
        byEmployee: rows.map((row) => ({ label: row.employeeName, value: row.total })),
      },
    });
  } catch (error) {
    return apiError(error, "Failed to load reports");
  }
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
