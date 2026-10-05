import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Client } from "@/models/Client";

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

// GET - Get contact emails for a client
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const client = await Client.findById(id).select("contactEmails email").lean();

  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    contactEmails: (client.contactEmails || []) as string[],
    primaryEmail: client.email as string,
  });
}

// POST - Add contact email(s) to a client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const body = await req.json();
  const { emails } = body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { message: "Emails array is required" },
      { status: 400 }
    );
  }

  const client = await Client.findById(id);
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  // Normalize emails and filter out duplicates
  const normalizedEmails = emails
    .map((e: string) => String(e).trim().toLowerCase())
    .filter((e: string) => e && e.includes("@"))
    .filter((e: string, i: number, arr: string[]) => arr.indexOf(e) === i);

  // Merge with existing contact emails, avoiding duplicates
  const existingEmails = (client.contactEmails || []).map((e: string) => String(e).toLowerCase());
  const newEmails = normalizedEmails.filter((e: string) => !existingEmails.includes(e));

  if (newEmails.length === 0) {
    return NextResponse.json({
      message: "All emails already exist",
      contactEmails: client.contactEmails || [],
    });
  }

  client.contactEmails = [...(client.contactEmails || []), ...newEmails];
  await client.save();

  return NextResponse.json({
    message: "Contact emails added successfully",
    contactEmails: client.contactEmails || [],
  });
}

// DELETE - Remove a contact email from a client
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { message: "Email parameter is required" },
      { status: 400 }
    );
  }

  const client = await Client.findById(id);
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  client.contactEmails = (client.contactEmails || []).filter(
    (e: string) => String(e).toLowerCase() !== normalizedEmail
  );
  await client.save();

  return NextResponse.json({
    message: "Contact email removed successfully",
    contactEmails: client.contactEmails || [],
  });
}
