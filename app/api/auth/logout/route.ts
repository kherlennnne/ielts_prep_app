import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, LAST_ACTIVE_COOKIE_NAME, REMEMBER_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieNames = [AUTH_COOKIE_NAME, REMEMBER_COOKIE_NAME, LAST_ACTIVE_COOKIE_NAME];

  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
