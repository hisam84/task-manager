import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGES = new Set(["/login"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get("session_user_id")?.value);

  if (PUBLIC_PAGES.has(pathname)) {
    if (hasSession && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
