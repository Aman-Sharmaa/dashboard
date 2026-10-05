import crypto from "crypto";
import jwt from "jsonwebtoken";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_SENDS = 3;

function getOtpSecret(): string {
  const secret = process.env.OTP_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_SESSION_SECRET or JWT_SECRET must be set");
  return secret;
}

export function generateOtp(): string {
  const max = Math.pow(10, OTP_LENGTH);
  const min = Math.pow(10, OTP_LENGTH - 1);
  return String(crypto.randomInt(min, max));
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const candidate = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export function generateSessionToken(email: string, ipAddress: string): string {
  return jwt.sign(
    { email, ipAddress, purpose: "otp_session" },
    getOtpSecret(),
    { expiresIn: `${OTP_EXPIRY_MINUTES}m` }
  );
}

export function verifySessionToken(token: string): { email: string; ipAddress: string } {
  const payload = jwt.verify(token, getOtpSecret()) as {
    email: string;
    ipAddress: string;
    purpose: string;
  };
  if (payload.purpose !== "otp_session") throw new Error("Invalid session token purpose");
  return { email: payload.email, ipAddress: payload.ipAddress };
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

export { MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MINUTES, RATE_LIMIT_MAX_SENDS, OTP_EXPIRY_MINUTES };
