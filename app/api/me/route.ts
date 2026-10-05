import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

const COOKIE_NAME = "kalp_auth_token";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const payload = verifyToken(token);

    // Look up employee to get isOutsider flag
    let isOutsider = false;
    let isManager = false;
    if (payload.role === "employee") {
      await connectDB();
      const emp = await Employee.findOne({ email: payload.email }).select("isOutsider").lean();
      if (emp && (emp as any).isOutsider) isOutsider = true;
      const scope = await getEmployeeWorkScope(payload.email);
      isManager = scope.isManager;
    }

    return NextResponse.json({
      user: { userId: payload.userId, email: payload.email, role: payload.role, isOutsider, isManager },
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
