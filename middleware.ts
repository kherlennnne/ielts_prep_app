import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "ielts_auth";
const AUTH_COOKIE_VALUE = "ok";
const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // If credentials are not configured, keep the app unlocked.
  if (!username || !password) {
    return NextResponse.next();
  }

  if (pathname === LOGIN_PATH || pathname.startsWith("/api/auth/")) {
    const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;

    if (pathname === LOGIN_PATH && isAuthed) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
  if (!isAuthed) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
