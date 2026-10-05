import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LoginOtp } from "@/models/LoginOtp";
import {
  generateOtp,
  hashOtp,
  generateSessionToken,
  getOtpExpiry,
  verifySessionToken,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX_SENDS,
  OTP_EXPIRY_MINUTES,
} from "@/lib/otp";
import { sendMail } from "@/lib/mailer";
import { loginOtpEmail } from "@/lib/email-templates";

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
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Session token is required" },
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

    const ipAddress = getClientIp(req);

    const rateLimitSince = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    );
    const recentOtpCount = await LoginOtp.countDocuments({
      email: session.email,
      createdAt: { $gte: rateLimitSince },
    });

    if (recentOtpCount >= RATE_LIMIT_MAX_SENDS) {
      return NextResponse.json(
        {
          message: `Too many codes sent. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
        },
        { status: 429 }
      );
    }

    const user = await User.findOne({ email: session.email })
      .select("name email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { message: "Session invalid" },
        { status: 401 }
      );
    }

    await LoginOtp.deleteMany({ email: session.email, verified: false });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const newSessionToken = generateSessionToken(session.email, ipAddress);
    const expiresAt = getOtpExpiry();

    await LoginOtp.create({
      email: session.email,
      otpHash,
      sessionToken: newSessionToken,
      ipAddress,
      expiresAt,
    });

    const html = loginOtpEmail({
      recipientName: user.name || session.email,
      otp,
      expiryMinutes: OTP_EXPIRY_MINUTES,
      ipAddress,
    });

    await sendMail({
      to: session.email,
      subject: `${otp} is your Kalp login code`,
      html,
    });

    return NextResponse.json(
      {
        message: "New verification code sent",
        sessionToken: newSessionToken,
        expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
