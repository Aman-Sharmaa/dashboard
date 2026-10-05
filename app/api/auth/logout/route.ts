import { NextResponse } from "next/server";

const COOKIE_NAME = "kalp_auth_token";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out" });

  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });

  return res;
}

