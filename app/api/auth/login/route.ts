import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  LAST_ACTIVE_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  REMEMBER_ME_MAX_AGE_SECONDS,
  USER_COOKIE_NAME,
} from "@/lib/auth";

function resolveUser(username: string, password: string): string | null {
  if (
    username === process.env.BASIC_AUTH_USERNAME &&
    password === process.env.BASIC_AUTH_PASSWORD
  ) {
    return process.env.BASIC_AUTH_USERNAME;
  }
  if (
    username === "cutie" &&
    password === process.env.CUTIE_AUTH_PASSWORD
  ) {
    return "cutie";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (!process.env.BASIC_AUTH_USERNAME || !process.env.BASIC_AUTH_PASSWORD) {
    return NextResponse.json(
      { message: "Auth credentials are not configured on the server." },
      { status: 500 }
    );
  }

  const resolvedUser = resolveUser(body.username ?? "", body.password ?? "");
  if (!resolvedUser) {
    return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const rememberMe = Boolean(body.rememberMe);
  const now = Date.now().toString();

  const commonCookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  };

  response.cookies.set({ name: AUTH_COOKIE_NAME, value: AUTH_COOKIE_VALUE, ...commonCookieOptions });
  response.cookies.set({ name: REMEMBER_COOKIE_NAME, value: rememberMe ? "1" : "0", ...commonCookieOptions });
  response.cookies.set({ name: LAST_ACTIVE_COOKIE_NAME, value: now, ...commonCookieOptions });

  // Non-httpOnly so client components can read it to adjust UI
  response.cookies.set({
    name: USER_COOKIE_NAME,
    value: resolvedUser,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  return response;
}
