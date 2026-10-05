import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LoginOtp } from "@/models/LoginOtp";
import { signToken } from "@/lib/auth";
import { verifyOtpHash, verifySessionToken, MAX_ATTEMPTS } from "@/lib/otp";

const COOKIE_NAME = "kalp_auth_token";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { otp, sessionToken } = await req.json();

    if (!otp || !sessionToken) {
      return NextResponse.json(
        { message: "Verification code and session are required" },
        { status: 400 }
      );
    }

    const otpStr = String(otp).trim();
    if (!/^\d{6}$/.test(otpStr)) {
      return NextResponse.json(
        { message: "Invalid verification code format" },
        { status: 400 }
      );
    }

    let session: { email: string; ipAddress: string };
    try {
      session = verifySessionToken(sessionToken);
    } catch {
      return NextResponse.json(
        { message: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(req);
    if (session.ipAddress !== "unknown" && session.ipAddress !== clientIp) {
      return NextResponse.json(
        { message: "Session invalid. IP address mismatch. Please sign in again." },
        { status: 403 }
      );
    }

    const otpDoc = await LoginOtp.findOne({
      sessionToken,
      email: session.email,
      verified: false,
    });

    if (!otpDoc) {
      return NextResponse.json(
        { message: "No pending verification found. Please sign in again." },
        { status: 404 }
      );
    }

    if (otpDoc.expiresAt < new Date()) {
      await LoginOtp.deleteOne({ _id: otpDoc._id });
      return NextResponse.json(
        { message: "Verification code expired. Please sign in again." },
        { status: 410 }
      );
    }

    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      await LoginOtp.deleteOne({ _id: otpDoc._id });
      return NextResponse.json(
        { message: "Too many failed attempts. Please sign in again." },
        { status: 429 }
      );
    }

    const isValid = verifyOtpHash(otpStr, otpDoc.otpHash);

    if (!isValid) {
      await LoginOtp.updateOne(
        { _id: otpDoc._id },
        { $inc: { attempts: 1 } }
      );
      const remaining = MAX_ATTEMPTS - otpDoc.attempts - 1;
      return NextResponse.json(
        {
          message: `Incorrect verification code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
          attemptsRemaining: remaining,
        },
        { status: 401 }
      );
    }

    await LoginOtp.updateOne(
      { _id: otpDoc._id },
      { verified: true }
    );

    await LoginOtp.deleteMany({
      email: session.email,
      _id: { $ne: otpDoc._id },
      verified: false,
    });

    const user = await User.findOne({ email: session.email }).lean();
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("OTP verification error", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
