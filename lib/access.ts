import type { SessionUser } from "@/lib/types";

export function isManagerOrAdmin(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function canViewPenaltyAndOvertime(role?: string | null): boolean {
  if (!role || role === "EMPLOYEE") return false;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function canCreateCompany(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}

export function canDeleteTask(role?: string | null): boolean {
  if (!role || role === "EMPLOYEE") return false;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function canAccessTask(
  user: SessionUser,
  task: { companyId: string; assigneeId: string; creatorId?: string | null }
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.companyId || task.companyId !== user.companyId) return false;
  if (isManagerOrAdmin(user.role)) return true;
  return task.assigneeId === user.id || (!!task.creatorId && task.creatorId === user.id);
}

export function canAssignTaskToUser(
  creator: { id: string; role: string; order?: number | null },
  assignee: { id: string; role: string; order?: number | null }
): { allowed: boolean; reason?: string } {
  // Managers and Admins can assign to anyone
  if (isManagerOrAdmin(creator.role)) {
    return { allowed: true };
  }

  // Self-assignment is always allowed
  if (creator.id === assignee.id) {
    return { allowed: true };
  }

  // Regular employees cannot assign to Managers or Admins
  if (isManagerOrAdmin(assignee.role)) {
    return {
      allowed: false,
      reason: "সিনিয়র কর্মকর্তাদের টাস্ক এসাইন করা যাবে না। (Employees cannot assign tasks to managers or admins)",
    };
  }

  // Regular employees can only assign to junior employees (order > creator.order)
  const creatorOrder = creator.order ?? 0;
  const assigneeOrder = assignee.order ?? 0;

  if (assigneeOrder <= creatorOrder) {
    return {
      allowed: false,
      reason: "সিনিয়র বা সমমর্যাদার সহকর্মীদের টাস্ক এসাইন করা যাবে না। আপনি শুধুমাত্র আপনার জুনিয়রদের টাস্ক এসাইন করতে পারবেন। (You can only assign tasks to junior team members)",
    };
  }

  return { allowed: true };
}
