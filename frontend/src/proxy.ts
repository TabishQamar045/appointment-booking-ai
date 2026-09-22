import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` file/function convention to `proxy`.
//
// This only checks for the *presence* of the auth cookie to redirect for
// UX purposes (bounce logged-out users away from /dashboard, bounce
// logged-in users away from /login). It intentionally does NOT verify the
// JWT signature here - that would require duplicating JWT_SECRET into the
// frontend. The actual security boundary is the backend: every API call
// carries the cookie and the backend independently verifies it, returning
// 401 if it's invalid/expired, which the frontend handles by redirecting to
// /login (see contexts/auth-context.tsx).
const AUTH_COOKIE_NAME = "auth_token";

export function proxy(request: NextRequest) {
  const hasAuthCookie = request.cookies.has(AUTH_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedPage = pathname.startsWith("/dashboard");

  if (isProtectedPage && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && hasAuthCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
