import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "session_user_id";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const FALLBACK_SECRET = "task-manager-neon-session-auth-secret-prod-key-2025-fallback";

export function getSessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || FALLBACK_SECRET;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export function createSessionValue(userId: string, now = Date.now()): string {
  const secret = getSessionSecret();
  const exp = now + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseSessionValue(raw: string | undefined, now = Date.now()): string | null {
  if (!raw) return null;
  const secret = getSessionSecret();

  const parts = raw.split(".");
  if (parts.length !== 3) return null;

  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;

  const payload = `${userId}.${expStr}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return null;
  return userId;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export function checkLoginRateLimit(key: string, now = Date.now()): boolean {
  const existing = loginAttempts.get(key);
  if (!existing || now > existing.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (existing.count >= LOGIN_MAX_ATTEMPTS) return false;
  existing.count += 1;
  return true;
}

export function resetLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}
