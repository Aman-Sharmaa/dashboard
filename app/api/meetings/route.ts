import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Meeting } from "@/models/Meeting";
import { Project } from "@/models/Project";
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

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const showAll = searchParams.get("showAll") === "true";

  const filter: Record<string, unknown> = {};
  if (projectId && projectId !== "__all__") {
    filter.project = projectId;
  }

  // Everyone (including admins) sees only their own meetings (created by them OR they are attendees)
  // Each user's calendar is separate - no one sees other users' meetings
  const userDoc = await User.findById(user.userId).select("email").lean();
  const userEmail = userDoc ? (userDoc as any).email : null;

  if (userEmail) {
    // Use $or to include meetings where user is creator OR attendee
    filter.$or = [
      { createdBy: user.userId },
      { attendees: userEmail }
    ];
  } else {
    // Fallback: only meetings created by user
    filter.createdBy = user.userId;
  }

  const meetings = await Meeting.find(filter)
    .sort({ startTime: 1 })
    .populate("project", "name")
    .populate("createdBy", "email name")
    .lean();

  return NextResponse.json({
    meetings: meetings.map((m: any) => ({
      id: String(m._id),
      title: m.title,
      description: m.description || "",
      projectId: String(m.project?._id || m.project),
      projectName: m.project?.name || "",
      createdById: String(m.createdBy?._id || m.createdBy),
      createdByName: m.createdBy?.name || "",
      createdByEmail: m.createdBy?.email || "",
      startTime: m.startTime,
      endTime: m.endTime,
      attendees: m.attendees || [],
      googleCalendarEventId: m.googleCalendarEventId || null,
      meetingLink: m.meetingLink || null,
      isRecurring: m.isRecurring || false,
      recurrenceType: m.recurrenceType || null,
      parentMeetingId: m.parentMeetingId ? String(m.parentMeetingId) : null,
      recurrenceInstance: m.recurrenceInstance || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const {
    title,
    description,
    projectId,
    startTime,
    endTime,
    attendees,
    isRecurring,
    recurrenceType,
    recurrenceEndDate,
    recurrenceCount,
    recurrenceDaysOfWeek,
    recurrenceDayOfMonth,
    recurrenceInterval,
  } = body;

  if (!title || !projectId || !startTime || !endTime) {
    return NextResponse.json(
      { message: "Title, project, start time and end time are required" },
      { status: 400 }
    );
  }

  const project = await Project.findById(projectId).select("_id").lean();
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ message: "Invalid start or end time" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ message: "End time must be after start time" }, { status: 400 });
  }

  const creator = await User.findById(user.userId).select(
    "email name googleCalendarAccessToken googleCalendarRefreshToken googleCalendarExpiryDate googleCalendarEmail"
  );

  // Create parent meeting (first instance)
  const meetingData: any = {
    title: String(title).trim(),
    description: description || undefined,
    project: project._id,
    createdBy: user.userId,
    startTime: start,
    endTime: end,
    attendees:
      Array.isArray(attendees) && attendees.length > 0
        ? attendees.map((a: string) => String(a).trim()).filter(Boolean)
        : undefined,
  };

  // Add recurrence data if it's a recurring meeting
  if (isRecurring && recurrenceType) {
    meetingData.isRecurring = true;
    meetingData.recurrenceType = recurrenceType;
    meetingData.recurrenceInterval = recurrenceInterval ? parseInt(String(recurrenceInterval)) : 1;
    meetingData.recurrenceInstance = 1;

    if (recurrenceEndDate) {
      meetingData.recurrenceEndDate = new Date(recurrenceEndDate);
    }
    if (recurrenceCount) {
      meetingData.recurrenceCount = parseInt(String(recurrenceCount));
    }
    if (recurrenceDaysOfWeek && Array.isArray(recurrenceDaysOfWeek)) {
      meetingData.recurrenceDaysOfWeek = recurrenceDaysOfWeek.map((d: any) => parseInt(String(d)));
    }
    if (recurrenceDayOfMonth) {
      meetingData.recurrenceDayOfMonth = parseInt(String(recurrenceDayOfMonth));
    }
  }

  const parentMeeting = await Meeting.create(meetingData);
  const parentMeetingId = parentMeeting._id;

  // Generate recurring instances if needed
  const allMeetings: any[] = [parentMeeting];
  if (isRecurring && recurrenceType) {
    const instances = generateRecurringInstances(
      parentMeeting,
      recurrenceType,
      recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      recurrenceCount ? parseInt(String(recurrenceCount)) : null,
      recurrenceInterval ? parseInt(String(recurrenceInterval)) : 1,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth
    );

    if (instances.length > 0) {
      // Set parentMeetingId for all instances
      const instancesWithParent = instances.map((inst, idx) => ({
        ...inst,
        parentMeetingId,
        recurrenceInstance: idx + 2, // Start from 2 (1 is the parent)
      }));

      const createdInstances = await Meeting.insertMany(instancesWithParent);
      allMeetings.push(...createdInstances);
    }
  }

  // Try to push to Google Calendar if creator is connected (best-effort, non-blocking for errors)
  try {
    if (creator && creator.googleCalendarAccessToken && creator.googleCalendarEmail) {
      const accessToken = await ensureValidGoogleAccessToken(creator);
      if (accessToken) {
        // For recurring meetings, create a recurring event in Google Calendar
        if (isRecurring && recurrenceType) {
          const recurrenceRule = buildGoogleRecurrenceRule(
            recurrenceType,
            recurrenceEndDate ? new Date(recurrenceEndDate) : null,
            recurrenceCount ? parseInt(String(recurrenceCount)) : null,
            recurrenceInterval ? parseInt(String(recurrenceInterval)) : 1,
            recurrenceDaysOfWeek,
            recurrenceDayOfMonth
          );

          const eventRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: parentMeeting.title,
                description: parentMeeting.description,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
                attendees: (parentMeeting.attendees || []).map((email: string) => ({ email })),
                recurrence: [`RRULE:${recurrenceRule}`],
                conferenceData: {
                  createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
                },
              }),
            }
          );

          if (eventRes.ok) {
            const eventData = await eventRes.json();
            // Update parent meeting with Google Calendar event ID and meeting link
            parentMeeting.googleCalendarEventId = eventData.id;
            // Extract meeting link (Google Meet, Zoom, Teams, etc.)
            const meetingLink = extractMeetingLink(eventData);
            if (meetingLink) {
              parentMeeting.meetingLink = meetingLink;
            }
            await parentMeeting.save();
          }
        } else {
          // Single meeting
          const eventRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: parentMeeting.title,
                description: parentMeeting.description,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
                attendees: (parentMeeting.attendees || []).map((email: string) => ({ email })),
                conferenceData: {
                  createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
                },
              }),
            }
          );

          if (eventRes.ok) {
            const eventData = await eventRes.json();
            parentMeeting.googleCalendarEventId = eventData.id;
            // Extract meeting link (Google Meet, Zoom, Teams, etc.)
            const meetingLink = extractMeetingLink(eventData);
            if (meetingLink) {
              parentMeeting.meetingLink = meetingLink;
            }
            await parentMeeting.save();
          }
        }
      }
    }
  } catch {
    // ignore sync errors
  }

  return NextResponse.json(
    {
      meeting: {
        id: String(parentMeeting._id),
        title: parentMeeting.title,
        description: parentMeeting.description || "",
        projectId: String(parentMeeting.project),
        createdById: String(parentMeeting.createdBy),
        startTime: parentMeeting.startTime,
        endTime: parentMeeting.endTime,
        attendees: parentMeeting.attendees || [],
        googleCalendarEventId: parentMeeting.googleCalendarEventId || null,
        isRecurring: parentMeeting.isRecurring || false,
        totalInstances: allMeetings.length,
      },
    },
    { status: 201 }
  );
}

function generateRecurringInstances(
  parentMeeting: any,
  recurrenceType: string,
  endDate: Date | null,
  count: number | null,
  interval: number,
  daysOfWeek?: number[],
  dayOfMonth?: number
): any[] {
  const instances: any[] = [];
  const start = new Date(parentMeeting.startTime);
  const end = new Date(parentMeeting.endTime);
  const durationMs = end.getTime() - start.getTime();

  let currentDate = new Date(start);
  let instanceCount = 0;
  const maxCount = count || 365; // Default to 1 year if no count/end date
  const maxDate = endDate || new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

  while (instanceCount < maxCount && currentDate <= maxDate) {
    // Calculate next occurrence
    let nextDate = new Date(currentDate);

    if (recurrenceType === "daily") {
      nextDate.setDate(nextDate.getDate() + interval);
    } else if (recurrenceType === "weekly") {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next occurrence from selected days
        const currentDay = currentDate.getDay();
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

        // Find next day in current week (excluding today)
        let nextDay = sortedDays.find((d) => d > currentDay);

        if (nextDay !== undefined) {
          // Same week
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
        } else {
          // Next week - find first day
          nextDay = sortedDays[0];
          const daysUntilNext = 7 - currentDay + nextDay;
          // Add (interval - 1) weeks if interval > 1
          const additionalWeeks = interval > 1 ? (interval - 1) * 7 : 0;
          nextDate.setDate(nextDate.getDate() + daysUntilNext + additionalWeeks);
        }
      } else {
        // Default: same day next week
        nextDate.setDate(nextDate.getDate() + 7 * interval);
      }
    } else if (recurrenceType === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + interval);
      if (dayOfMonth) {
        // Try to set the day, but handle months with fewer days
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
    } else {
      // Custom - same as weekly for now
      nextDate.setDate(nextDate.getDate() + 7 * interval);
    }

    if (nextDate > maxDate) break;

    const nextEnd = new Date(nextDate.getTime() + durationMs);

    instances.push({
      title: parentMeeting.title,
      description: parentMeeting.description,
      project: parentMeeting.project,
      createdBy: parentMeeting.createdBy,
      startTime: nextDate,
      endTime: nextEnd,
      attendees: parentMeeting.attendees,
      isRecurring: true,
      recurrenceType: parentMeeting.recurrenceType,
      recurrenceInterval: parentMeeting.recurrenceInterval,
      recurrenceDaysOfWeek: parentMeeting.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: parentMeeting.recurrenceDayOfMonth,
    });

    currentDate = nextDate;
    instanceCount++;
  }

  return instances;
}

// Extract meeting link from Google Calendar event
function extractMeetingLink(eventData: any): string | null {
  // Check for Google Meet link (hangoutsLink - legacy)
  if (eventData.hangoutsLink) {
    return eventData.hangoutsLink;
  }

  // Check for conference data (newer format)
  if (eventData.conferenceData?.entryPoints) {
    const videoEntry = eventData.conferenceData.entryPoints.find(
      (ep: any) => ep.entryPointType === "video" || ep.entryPointType === "more"
    );
    if (videoEntry?.uri) {
      return videoEntry.uri;
    }
  }

  // Check description for common meeting links (Zoom, Teams, etc.)
  if (eventData.description) {
    const zoomMatch = eventData.description.match(/https?:\/\/[^\s]*zoom\.us\/[^\s]*/i);
    if (zoomMatch) return zoomMatch[0];

    const teamsMatch = eventData.description.match(/https?:\/\/[^\s]*teams\.microsoft\.com\/[^\s]*/i);
    if (teamsMatch) return teamsMatch[0];

    const meetMatch = eventData.description.match(/https?:\/\/meet\.google\.com\/[^\s]*/i);
    if (meetMatch) return meetMatch[0];
  }

  return null;
}

function buildGoogleRecurrenceRule(
  recurrenceType: string,
  endDate: Date | null,
  count: number | null,
  interval: number,
  daysOfWeek?: number[],
  dayOfMonth?: number
): string {
  let freq = "";
  let byDay = "";
  let byMonthDay = "";
  let until = "";
  let countStr = "";

  if (recurrenceType === "daily") {
    freq = "DAILY";
  } else if (recurrenceType === "weekly") {
    freq = "WEEKLY";
    if (daysOfWeek && daysOfWeek.length > 0) {
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      byDay = daysOfWeek.map((d) => dayMap[d]).join(",");
    }
  } else if (recurrenceType === "monthly") {
    freq = "MONTHLY";
    if (dayOfMonth) {
      byMonthDay = String(dayOfMonth);
    }
  } else {
    freq = "WEEKLY";
  }

  if (endDate) {
    until = `;UNTIL=${endDate.toISOString().split("T")[0].replace(/-/g, "")}`;
  } else if (count) {
    countStr = `;COUNT=${count}`;
  }

  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`];
  if (byDay) parts.push(`BYDAY=${byDay}`);
  if (byMonthDay) parts.push(`BYMONTHDAY=${byMonthDay}`);
  if (until) parts.push(until);
  if (countStr) parts.push(countStr);

  return parts.join(";");
}

async function ensureValidGoogleAccessToken(userDoc: any): Promise<string | null> {
  const now = new Date();
  if (
    userDoc.googleCalendarAccessToken &&
    userDoc.googleCalendarExpiryDate &&
    new Date(userDoc.googleCalendarExpiryDate) > now
  ) {
    return userDoc.googleCalendarAccessToken as string;
  }

  if (!userDoc.googleCalendarRefreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("refresh_token", userDoc.googleCalendarRefreshToken);
  params.set("grant_type", "refresh_token");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token || !tokenData.expires_in) return null;

  userDoc.googleCalendarAccessToken = tokenData.access_token;
  userDoc.googleCalendarExpiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
  await userDoc.save();

  return tokenData.access_token as string;
}
