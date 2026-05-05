import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "ielts_auth";
const AUTH_COOKIE_VALUE = "ok";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
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
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: AUTH_COOKIE_VALUE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
