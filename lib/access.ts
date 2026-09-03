import type { SessionUser } from "@/lib/types";

export function isManagerOrAdmin(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function canCreateCompany(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}

export function canAccessTask(
  user: SessionUser,
  task: { companyId: string; assigneeId: string }
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.companyId || task.companyId !== user.companyId) return false;
  if (isManagerOrAdmin(user.role)) return true;
  return task.assigneeId === user.id;
}
