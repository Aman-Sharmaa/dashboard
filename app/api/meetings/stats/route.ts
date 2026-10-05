import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Meeting } from "@/models/Meeting";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month"); // Format: YYYY-MM

  const filter: Record<string, unknown> = {};

  // Filter by project
  if (projectId && projectId !== "__all__") {
    filter.project = projectId;
  }

  // Filter by employee (creator)
  if (employeeId && employeeId !== "__all__") {
    const employee = await Employee.findById(employeeId).select("email").lean();
    if (employee && (employee as any).email) {
      const user = await User.findOne({ email: (employee as any).email }).select("_id").lean();
      if (user) {
        filter.createdBy = user._id;
      } else {
        // If no user found, return empty results
        return NextResponse.json({
          totalMinutes: 0,
          totalHours: 0,
          remainingMinutes: 0,
          totalMeetings: 0,
          meetings: [],
        });
      }
    }
  }

  // Filter by month
  if (month) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    filter.startTime = { $gte: startDate, $lte: endDate };
  }

  const meetings = await Meeting.find(filter)
    .populate("project", "name")
    .populate("createdBy", "email name")
    .lean();

  // Calculate total time spent
  let totalMinutes = 0;
  const meetingDetails = meetings.map((m: any) => {
    const start = new Date(m.startTime);
    const end = new Date(m.endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMins = Math.floor(durationMs / 60000);
    totalMinutes += durationMins;

    return {
      id: String(m._id),
      title: m.title,
      projectId: String(m.project?._id || m.project),
      projectName: m.project?.name || "",
      createdById: String(m.createdBy?._id || m.createdBy),
      createdByName: m.createdBy?.name || "",
      createdByEmail: m.createdBy?.email || "",
      startTime: m.startTime,
      endTime: m.endTime,
      durationMinutes: durationMins,
      attendees: m.attendees || [],
    };
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return NextResponse.json({
    totalMinutes,
    totalHours,
    remainingMinutes,
    totalMeetings: meetings.length,
    meetings: meetingDetails,
  });
}
