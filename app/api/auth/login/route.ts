import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { signToken, comparePassword } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const identifier = body.email || body.id || body.username;
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "User ID/Email and password are required" },
        { status: 400 }
      );
    }

    const trimmedIdentifier = String(identifier).trim().toLowerCase();

    // Match by email or MongoDB _id if valid
    const query: any = {
      $or: [
        { email: trimmedIdentifier },
        { email: { $regex: new RegExp(`^${trimmedIdentifier}$`, "i") } },
      ],
    };

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(String(password), user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
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
    console.error("Login error", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
