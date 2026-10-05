import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Meeting } from "@/models/Meeting";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const meeting = await Meeting.findById(meetingId);

  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  // Only allow creator or admin to delete
  if (user.role !== "admin" && String(meeting.createdBy) !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // If it's a recurring meeting, delete all instances
  if (meeting.isRecurring && !meeting.parentMeetingId) {
    // Delete all instances
    await Meeting.deleteMany({
      $or: [
        { _id: meeting._id },
        { parentMeetingId: meeting._id },
      ],
    });
  } else if (meeting.parentMeetingId) {
    // If deleting an instance, just delete this one
    await Meeting.findByIdAndDelete(meetingId);
  } else {
    // Regular meeting, just delete it
    await Meeting.findByIdAndDelete(meetingId);
  }

  return NextResponse.json({ message: "Meeting cancelled successfully" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const meeting = await Meeting.findById(meetingId)
    .populate("project", "name")
    .populate("createdBy", "email name")
    .lean();

  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  // Employees can only see their own meetings or meetings they're attendees of
  if (user.role === "employee") {
    const userDoc = await User.findById(user.userId).select("email").lean();
    const userEmail = userDoc ? (userDoc as any).email : null;

    const isCreator = String(meeting.createdBy?._id || meeting.createdBy) === user.userId;
    const isAttendee = userEmail && (meeting.attendees || []).includes(userEmail);

    if (!isCreator && !isAttendee) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    meeting: {
      id: String(meeting._id),
      title: meeting.title,
      description: meeting.description || "",
      projectId: String(meeting.project?._id || meeting.project),
      projectName: (meeting.project as any)?.name || "",
      createdById: String(meeting.createdBy?._id || meeting.createdBy),
      createdByName: (meeting.createdBy as any)?.name || "",
      createdByEmail: (meeting.createdBy as any)?.email || "",
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendees: meeting.attendees || [],
      googleCalendarEventId: meeting.googleCalendarEventId || null,
      meetingLink: meeting.meetingLink || null,
      isRecurring: meeting.isRecurring || false,
      recurrenceType: meeting.recurrenceType || null,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { title, description, projectId, startTime, endTime, attendees } = body;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  // Only allow creator or admin to edit
  if (user.role !== "admin" && String(meeting.createdBy) !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!title || !projectId || !startTime || !endTime) {
    return NextResponse.json(
      { message: "Title, project, start time and end time are required" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ message: "Invalid start or end time" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ message: "End time must be after start time" }, { status: 400 });
  }

  const project = await Project.findById(projectId).select("_id").lean();
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  // Update meeting
  meeting.title = String(title).trim();
  meeting.description = description || undefined;
  meeting.project = project._id;
  meeting.startTime = start;
  meeting.endTime = end;
  meeting.attendees =
    Array.isArray(attendees) && attendees.length > 0
      ? attendees.map((a: string) => String(a).trim()).filter(Boolean)
      : undefined;

  await meeting.save();

  return NextResponse.json({
    meeting: {
      id: String(meeting._id),
      title: meeting.title,
      description: meeting.description || "",
      projectId: String(meeting.project),
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendees: meeting.attendees || [],
    },
  });
}
