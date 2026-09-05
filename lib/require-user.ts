import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole, isCompanyAdmin, isSuperAdmin } from "@/lib/domain";
import type { SessionUser } from "@/lib/types";

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isSuperAdmin(user.role)) redirect(homePathForRole(user.role));
  return user;
}

export async function requireCompanyAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isCompanyAdmin(user.role)) redirect(homePathForRole(user.role));
  return user;
}

export async function requireEmployee(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "EMPLOYEE") redirect(homePathForRole(user.role));
  return user;
}
