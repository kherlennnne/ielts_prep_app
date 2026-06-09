import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  INACTIVITY_TIMEOUT_SECONDS,
  LAST_ACTIVE_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  REMEMBER_ME_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  USER_COOKIE_NAME,
} from "@/lib/auth";
import { recordUserSessionActivity } from "@/lib/userSessionTracking";

export async function POST(request: NextRequest) {
  const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
  if (!isAuthed) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const nowMs = Date.now();
  const lastActive = Number(request.cookies.get(LAST_ACTIVE_COOKIE_NAME)?.value);
  const hasValidLastActive = Number.isFinite(lastActive);
  const isTimedOut =
    !hasValidLastActive || nowMs - lastActive > INACTIVITY_TIMEOUT_SECONDS * 1000;

  if (isTimedOut) {
    await recordUserSessionActivity({
      sessionId: request.cookies.get(SESSION_COOKIE_NAME)?.value,
      username: request.cookies.get(USER_COOKIE_NAME)?.value,
      lastActiveMs: hasValidLastActive ? lastActive : undefined,
      nowMs,
      endReason: "timeout",
    });

    const response = NextResponse.json({ message: "Session timed out." }, { status: 401 });
    for (const name of [
      AUTH_COOKIE_NAME,
      REMEMBER_COOKIE_NAME,
      LAST_ACTIVE_COOKIE_NAME,
      SESSION_COOKIE_NAME,
      USER_COOKIE_NAME,
    ]) {
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
  }

  await recordUserSessionActivity({
    sessionId: request.cookies.get(SESSION_COOKIE_NAME)?.value,
    username: request.cookies.get(USER_COOKIE_NAME)?.value,
    lastActiveMs: lastActive,
    nowMs,
  });

  const rememberMe = request.cookies.get(REMEMBER_COOKIE_NAME)?.value === "1";
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: LAST_ACTIVE_COOKIE_NAME,
    value: nowMs.toString(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  return response;
}
