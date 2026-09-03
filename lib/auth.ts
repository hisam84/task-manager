import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, parseSessionValue, sessionCookieOptions } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export type { SessionUser };
export { sessionCookieOptions, SESSION_COOKIE };
export { isManagerOrAdmin, canCreateCompany, canAccessTask } from "@/lib/access";

const USER_SESSION_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  department: true,
  companyId: true,
  company: {
    select: { id: true, name: true, slug: true, isActive: true },
  },
} as const;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function demoSwitchEnabled(): boolean {
  return process.env.ENABLE_DEMO_SWITCH === "true";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = parseSessionValue(cookieStore.get(SESSION_COOKIE)?.value);

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SESSION_SELECT,
  });

  if (!user) return null;
  if (user.role !== "SUPER_ADMIN" && user.company && user.company.isActive === false) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role as SessionUser["role"],
    department: user.department,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    companySlug: user.company?.slug ?? null,
  };
}

export async function getAllDemoPersonas() {
  if (!demoSwitchEnabled()) return [];

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      department: true,
      company: { select: { name: true } },
    },
    orderBy: { role: "asc" },
    take: 50,
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    department: u.department,
    companyName: u.company?.name ?? "Platform Wide",
  }));
}
