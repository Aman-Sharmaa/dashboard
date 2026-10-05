import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const user = await User.findById(payload.userId).lean();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name || "",
          role: user.role,
          featureAccess: (user as any).featureAccess || [],
          canManageContent: (user as any).canManageContent || false,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Auth me error", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

// PATCH: update user profile (name)
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (body.name !== undefined) {
      user.name = String(body.name).trim();
    }

    await user.save();

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

