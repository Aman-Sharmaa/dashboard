import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AccessGroup } from "@/models/AccessGroup";
import { ALL_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const groups = await AccessGroup.find({})
    .select("name type featureAccess createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    groups: groups.map((group: any) => ({
      _id: String(group._id),
      name: group.name,
      type: group.type,
      featureAccess: Array.isArray(group.featureAccess) ? group.featureAccess : [],
      createdAt: group.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const type = body?.type === "all" ? "all" : "specific";
  const featureAccessInput = Array.isArray(body?.featureAccess) ? body.featureAccess : [];

  if (!name) {
    return NextResponse.json({ message: "Group name is required" }, { status: 400 });
  }

  const allowedKeys = new Set(ALL_FEATURES.map((f) => f.key));
  const normalizedAccess: string[] =
    type === "all"
      ? ALL_FEATURES.map((f) => f.key)
      : Array.from(
          new Set(
            featureAccessInput
              .map((v: unknown) => String(v))
              .filter((key: string) => allowedKeys.has(key))
          )
        );

  if (type === "specific" && normalizedAccess.length === 0) {
    return NextResponse.json(
      { message: "Pick at least one feature for a specific group" },
      { status: 400 }
    );
  }

  try {
    const created = await AccessGroup.create({
      name,
      type,
      featureAccess: normalizedAccess,
      createdBy: admin.userId,
    });
    return NextResponse.json({
      group: {
        _id: String(created._id),
        name: created.name,
        type: created.type,
        featureAccess: created.featureAccess,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "A group with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Failed to create group" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  const name = String(body?.name || "").trim();
  const type = body?.type === "all" ? "all" : "specific";
  const featureAccessInput = Array.isArray(body?.featureAccess) ? body.featureAccess : [];

  if (!id) {
    return NextResponse.json({ message: "Group id is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ message: "Group name is required" }, { status: 400 });
  }

  const existing = await AccessGroup.findById(id).select("_id").lean();
  if (!existing) {
    return NextResponse.json({ message: "Access group not found" }, { status: 404 });
  }

  const allowedKeys = new Set(ALL_FEATURES.map((f) => f.key));
  const normalizedAccess: string[] =
    type === "all"
      ? ALL_FEATURES.map((f) => f.key)
      : Array.from(
          new Set(
            featureAccessInput
              .map((v: unknown) => String(v))
              .filter((key: string) => allowedKeys.has(key))
          )
        );

  if (type === "specific" && normalizedAccess.length === 0) {
    return NextResponse.json(
      { message: "Pick at least one feature for a specific group" },
      { status: 400 }
    );
  }

  try {
    const updated = await AccessGroup.findByIdAndUpdate(
      id,
      {
        $set: {
          name,
          type,
          featureAccess: normalizedAccess,
        },
      },
      { new: true }
    )
      .select("name type featureAccess")
      .lean();

    if (!updated) {
      return NextResponse.json({ message: "Access group not found" }, { status: 404 });
    }

    return NextResponse.json({
      group: {
        _id: String((updated as any)._id),
        name: (updated as any).name,
        type: (updated as any).type,
        featureAccess: Array.isArray((updated as any).featureAccess)
          ? (updated as any).featureAccess
          : [],
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "A group with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });

  await connectDB();
  await AccessGroup.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
