import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  LAST_ACTIVE_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  USER_COOKIE_NAME,
} from "@/lib/auth";
import { recordUserSessionActivity } from "@/lib/userSessionTracking";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { reason?: string };
  const reason = body.reason === "inactivity" ? "inactivity" : "manual";
  const lastActive = Number(request.cookies.get(LAST_ACTIVE_COOKIE_NAME)?.value);

  await recordUserSessionActivity({
    sessionId: request.cookies.get(SESSION_COOKIE_NAME)?.value,
    username: request.cookies.get(USER_COOKIE_NAME)?.value,
    lastActiveMs: Number.isFinite(lastActive) ? lastActive : undefined,
    endReason: reason,
  });

  const response = NextResponse.json({ ok: true });
  const cookieNames = [
    AUTH_COOKIE_NAME,
    REMEMBER_COOKIE_NAME,
    LAST_ACTIVE_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    USER_COOKIE_NAME,
  ];

  for (const name of cookieNames) {
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
