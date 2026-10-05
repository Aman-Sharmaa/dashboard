import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Meeting } from "@/models/Meeting";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const meeting = await Meeting.findById(id).lean();

  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  // If meeting already has a meetingLink, return it
  if ((meeting as any).meetingLink) {
    return NextResponse.json({ meetingLink: (meeting as any).meetingLink });
  }

  // If no googleCalendarEventId, can't fetch
  if (!(meeting as any).googleCalendarEventId) {
    return NextResponse.json({ meetingLink: null });
  }

  // Fetch the creator User document (not lean, so we can save it)
  const creator = await User.findById((meeting as any).createdBy).select(
    "email googleCalendarAccessToken googleCalendarRefreshToken googleCalendarExpiryDate googleCalendarEmail"
  );

  if (!creator || !creator.googleCalendarAccessToken || !creator.googleCalendarEmail) {
    return NextResponse.json({ meetingLink: null });
  }

  try {
    const accessToken = await ensureValidGoogleAccessToken(creator);
    if (!accessToken) {
      return NextResponse.json({ meetingLink: null });
    }

    const eventRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent((meeting as any).googleCalendarEventId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!eventRes.ok) {
      const errorText = await eventRes.text();
      console.error("Google Calendar API error:", eventRes.status, errorText);

      // If it's a 500 error or other server error, return null and let frontend redirect to calendar
      if (eventRes.status >= 500) {
        return NextResponse.json({
          meetingLink: null,
          message: "Google Calendar service is temporarily unavailable. Redirecting to calendar event.",
          redirectToCalendar: true
        });
      }

      return NextResponse.json({
        meetingLink: null,
        message: `Failed to fetch event from Google Calendar (${eventRes.status}).`,
        redirectToCalendar: true
      });
    }

    const eventData = await eventRes.json();
    const meetingLink = extractMeetingLink(eventData);

    // Update the meeting with the link if found
    if (meetingLink) {
      await Meeting.findByIdAndUpdate(id, { meetingLink });
      return NextResponse.json({ meetingLink });
    }

    return NextResponse.json({
      meetingLink: null,
      message: "No meeting link found in Google Calendar event. The event may not have a video conference attached.",
      redirectToCalendar: true
    });
  } catch (err: any) {
    console.error("Error fetching meeting link:", err);
    return NextResponse.json({
      meetingLink: null,
      message: err?.message || "Failed to fetch meeting link from Google Calendar.",
      redirectToCalendar: true
    });
  }
}
