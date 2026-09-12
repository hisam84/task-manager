import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";
import { logActivity } from "@/lib/activity-log";

const updateCompanySettingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  overdueAlertRecipient: z.enum(["BOTH", "ASSIGNEE_ONLY"]).optional(),
  notifyAssignerOnTaskComplete: z.boolean().optional(),
  taskCompletionNotifyMode: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
  enableTaskCreatedEmail: z.boolean().optional(),
  allowEmployeeTaskAssignment: z.boolean().optional(),
  defaultGraceMinutes: z.number().int().min(0).max(120).optional(),
  notifyAdminsOnLeaveRequest: z.boolean().optional(),
  companyId: z.string().optional(),
});

async function ensureCompanySettingsColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "overdueAlertRecipient" TEXT NOT NULL DEFAULT 'BOTH';
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "notifyAssignerOnTaskComplete" BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "taskCompletionNotifyMode" TEXT NOT NULL DEFAULT 'AUTOMATIC';
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "enableTaskCreatedEmail" BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "allowEmployeeTaskAssignment" BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultGraceMinutes" INTEGER NOT NULL DEFAULT 15;
      ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "notifyAdminsOnLeaveRequest" BOOLEAN NOT NULL DEFAULT true;
    `);
  } catch {
    // Ignore if table lacks DDL permissions or columns already exist
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    await ensureCompanySettingsColumns();

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get("companyId");

    let targetCompanyId = user.companyId;
    if (user.role === "SUPER_ADMIN" && queryCompanyId) {
      targetCompanyId = queryCompanyId;
    }

    if (!targetCompanyId) {
      if (user.role === "SUPER_ADMIN") {
        const firstCompany = await prisma.company.findFirst({ select: { id: true } });
        targetCompanyId = firstCompany?.id || null;
      }
    }

    if (!targetCompanyId) {
      return jsonError("No company associated with this account", 404);
    }

    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        enableLatePenalty: true,
        subscriptionEndsAt: true,
        overdueAlertRecipient: true,
        notifyAssignerOnTaskComplete: true,
        taskCompletionNotifyMode: true,
        enableTaskCreatedEmail: true,
        allowEmployeeTaskAssignment: true,
        defaultGraceMinutes: true,
        notifyAdminsOnLeaveRequest: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            tasks: true,
            departments: true,
          },
        },
      },
    });

    if (!company) {
      return jsonError("Company not found", 404);
    }

    return NextResponse.json(company);
  } catch (error) {
    return apiError(error, "Failed to fetch company settings");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    // Only Company Admin or Super Admin can edit company settings
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return jsonError("Forbidden: Only Company Admins or Super Admins can modify company settings", 403);
    }

    await ensureCompanySettingsColumns();

    const body = await req.json();
    const data = updateCompanySettingsSchema.parse(body);

    let targetCompanyId = user.companyId;
    if (user.role === "SUPER_ADMIN" && data.companyId) {
      targetCompanyId = data.companyId;
    }

    if (!targetCompanyId) {
      return jsonError("Target company not found", 400);
    }

    const existingCompany = await prisma.company.findUnique({
      where: { id: targetCompanyId },
    });

    if (!existingCompany) {
      return jsonError("Company not found", 404);
    }

    const updateData: any = {};
    if (data.name && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.overdueAlertRecipient !== undefined) {
      updateData.overdueAlertRecipient = data.overdueAlertRecipient;
    }
    if (typeof data.notifyAssignerOnTaskComplete === "boolean") {
      updateData.notifyAssignerOnTaskComplete = data.notifyAssignerOnTaskComplete;
    }
    if (data.taskCompletionNotifyMode) {
      updateData.taskCompletionNotifyMode = data.taskCompletionNotifyMode;
    }
    if (typeof data.enableTaskCreatedEmail === "boolean") {
      updateData.enableTaskCreatedEmail = data.enableTaskCreatedEmail;
    }
    if (typeof data.allowEmployeeTaskAssignment === "boolean") {
      updateData.allowEmployeeTaskAssignment = data.allowEmployeeTaskAssignment;
    }
    if (typeof data.defaultGraceMinutes === "number") {
      updateData.defaultGraceMinutes = data.defaultGraceMinutes;
    }
    if (typeof data.notifyAdminsOnLeaveRequest === "boolean") {
      updateData.notifyAdminsOnLeaveRequest = data.notifyAdminsOnLeaveRequest;
    }

    const updatedCompany = await prisma.company.update({
      where: { id: targetCompanyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        enableLatePenalty: true,
        subscriptionEndsAt: true,
        overdueAlertRecipient: true,
        notifyAssignerOnTaskComplete: true,
        taskCompletionNotifyMode: true,
        enableTaskCreatedEmail: true,
        allowEmployeeTaskAssignment: true,
        defaultGraceMinutes: true,
        notifyAdminsOnLeaveRequest: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            tasks: true,
            departments: true,
          },
        },
      },
    });

    // Record activity log
    await logActivity({
      companyId: targetCompanyId,
      userId: user.id,
      action: "COMPANY_SETTINGS_UPDATED",
      entityType: "COMPANY",
      entityId: targetCompanyId,
      description: `${user.name || "Admin"} updated company configuration settings.`,
      details: updateData,
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    return apiError(error, "Failed to update company settings");
  }
}
