import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
  department?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companySlug?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) {
    return null; // By default logged out
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: (user as any).username ?? null,
    role: user.role as any,
    department: user.department,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    companySlug: user.company?.slug ?? null,
  };
}

export async function getAllDemoPersonas() {
  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { role: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: (u as any).username ?? null,
    role: u.role,
    department: u.department,
    companyName: u.company?.name ?? "Platform Wide",
  }));
}
