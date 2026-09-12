import { prisma } from "@/lib/prisma";

export interface LogActivityParams {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType: "TASK" | "LEAVE" | "ATTENDANCE" | "USER" | "DEPARTMENT" | "SHIFT" | "HOLIDAY" | "AUTH" | string;
  entityId?: string | null;
  description: string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
}

/**
 * Asynchronously record an activity log in the database.
 * Does not throw or block the calling flow if logging fails.
 */
export async function logActivity(params: LogActivityParams) {
  try {
    if (!params.companyId) return null;

    let serializedDetails: string | null = null;
    if (params.details) {
      serializedDetails =
        typeof params.details === "string"
          ? params.details
          : JSON.stringify(params.details);
    }

    return await prisma.activityLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        description: params.description,
        details: serializedDetails,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to log activity:", err);
    return null;
  }
}
