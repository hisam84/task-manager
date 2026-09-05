import type { SessionUser } from "@/lib/types";
import { isCompanyAdmin, isSuperAdmin } from "@/lib/domain";

export function isManagerOrAdmin(role: string): boolean {
  return isCompanyAdmin(role);
}

export function canCreateCompany(role?: string | null): boolean {
  return isSuperAdmin(role ?? "");
}

export function canAccessTask(
  user: SessionUser,
  task: { companyId: string; assigneeId: string }
): boolean {
  if (isSuperAdmin(user.role)) return false;
  if (!user.companyId || task.companyId !== user.companyId) return false;
  if (isCompanyAdmin(user.role)) return true;
  return task.assigneeId === user.id;
}

export function requireCompanyId(user: SessionUser): string | null {
  if (isSuperAdmin(user.role)) return null;
  return user.companyId ?? null;
}
