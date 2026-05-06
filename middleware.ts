import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  INACTIVITY_TIMEOUT_SECONDS,
  LAST_ACTIVE_COOKIE_NAME,
  LOGIN_PATH,
  REMEMBER_COOKIE_NAME,
  REMEMBER_ME_MAX_AGE_SECONDS,
  RESTRICTED_USERS,
  USER_COOKIE_NAME,
} from "@/lib/auth";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // If credentials are not configured, keep the app unlocked.
  if (!username || !password) {
    return NextResponse.next();
  }

  const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
  const rememberMe = request.cookies.get(REMEMBER_COOKIE_NAME)?.value === "1";
  const rawLastActive = request.cookies.get(LAST_ACTIVE_COOKIE_NAME)?.value;
  const lastActive = rawLastActive ? Number(rawLastActive) : NaN;
  const hasValidLastActive = Number.isFinite(lastActive);
  const isTimedOut =
    isAuthed &&
    (!hasValidLastActive || Date.now() - lastActive > INACTIVITY_TIMEOUT_SECONDS * 1000);

  const clearAuthAndRedirectToLogin = () => {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    const allCookies = [AUTH_COOKIE_NAME, REMEMBER_COOKIE_NAME, LAST_ACTIVE_COOKIE_NAME, USER_COOKIE_NAME];
    for (const name of allCookies) {
      response.cookies.set({
        name,
        value: "",
        httpOnly: name !== USER_COOKIE_NAME,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  };

  if (pathname === LOGIN_PATH || pathname.startsWith("/api/auth/")) {
    if (pathname === LOGIN_PATH && isAuthed && !isTimedOut) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthed || isTimedOut) {
    return clearAuthAndRedirectToLogin();
  }

  // Block restricted users from accessing /materials
  const currentUser = request.cookies.get(USER_COOKIE_NAME)?.value ?? "";
  if (pathname.startsWith("/materials") && RESTRICTED_USERS.includes(currentUser)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: LAST_ACTIVE_COOKIE_NAME,
    value: Date.now().toString(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
