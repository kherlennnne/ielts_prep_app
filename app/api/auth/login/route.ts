import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  LAST_ACTIVE_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  REMEMBER_ME_MAX_AGE_SECONDS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  const expectedUsername = process.env.BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { message: "Auth credentials are not configured on the server." },
      { status: 500 }
    );
  }

  if (body.username !== expectedUsername || body.password !== expectedPassword) {
    return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const commonCookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  const rememberMe = Boolean(body.rememberMe);
  const now = Date.now().toString();

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: AUTH_COOKIE_VALUE,
    ...commonCookieOptions,
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  response.cookies.set({
    name: REMEMBER_COOKIE_NAME,
    value: rememberMe ? "1" : "0",
    ...commonCookieOptions,
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  response.cookies.set({
    name: LAST_ACTIVE_COOKIE_NAME,
    value: now,
    ...commonCookieOptions,
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  return response;
}
