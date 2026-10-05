import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getAuthUserFromCookies } from "@/lib/route-auth";
import { DEFAULT_SIDEBAR_SECTION_ORDER } from "@/lib/sidebar-sections";
import { ALL_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

const ALLOWED_SECTION_LABELS = new Set<string>([...DEFAULT_SIDEBAR_SECTION_ORDER]);
const VALID_FEATURE_KEYS = new Set(ALL_FEATURES.map((f) => f.key));

export async function GET() {
  const auth = await getAuthUserFromCookies();
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const doc = await User.findById(auth.userId)
    .select("dashboardWidgetPrefs sidebarSectionOrder adminSidebarHiddenFeatures")
    .lean();
  return NextResponse.json({
    dashboardWidgetPrefs: ((doc as any)?.dashboardWidgetPrefs || {}) as Record<string, boolean>,
    sidebarSectionOrder: Array.isArray((doc as any)?.sidebarSectionOrder)
      ? (doc as any).sidebarSectionOrder
      : [],
    adminSidebarHiddenFeatures: Array.isArray((doc as any)?.adminSidebarHiddenFeatures)
      ? (doc as any).adminSidebarHiddenFeatures
      : [],
    role: auth.role,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUserFromCookies();
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.dashboardWidgetPrefs !== undefined) {
    if (body.dashboardWidgetPrefs !== null && typeof body.dashboardWidgetPrefs !== "object") {
      return NextResponse.json({ message: "dashboardWidgetPrefs must be an object" }, { status: 400 });
    }
    const raw = (body.dashboardWidgetPrefs || {}) as Record<string, unknown>;
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "boolean") cleaned[String(k).slice(0, 64)] = v;
    }
    const existing = await User.findById(auth.userId).select("dashboardWidgetPrefs").lean();
    const prev = ((existing as any)?.dashboardWidgetPrefs || {}) as Record<string, boolean>;
    patch.dashboardWidgetPrefs = { ...prev, ...cleaned };
  }

  if (body.sidebarSectionOrder !== undefined) {
    if (!Array.isArray(body.sidebarSectionOrder)) {
      return NextResponse.json({ message: "sidebarSectionOrder must be an array" }, { status: 400 });
    }
    const order = (body.sidebarSectionOrder as unknown[])
      .map((x) => String(x || "").trim())
      .filter((x) => x && ALLOWED_SECTION_LABELS.has(x));
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const x of order) {
      if (seen.has(x)) continue;
      seen.add(x);
      unique.push(x);
    }
    patch.sidebarSectionOrder = unique;
  }

  if (body.adminSidebarHiddenFeatures !== undefined) {
    if (auth.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can set sidebar feature visibility" },
        { status: 403 }
      );
    }
    if (!Array.isArray(body.adminSidebarHiddenFeatures)) {
      return NextResponse.json({ message: "adminSidebarHiddenFeatures must be an array" }, { status: 400 });
    }
    const hidden = (body.adminSidebarHiddenFeatures as unknown[])
      .map((x) => String(x || "").trim())
      .filter((k) => k && VALID_FEATURE_KEYS.has(k) && k !== "dashboard");
    patch.adminSidebarHiddenFeatures = [...new Set(hidden)];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "No valid fields" }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(auth.userId, { $set: patch });

  return NextResponse.json({ ok: true, ...patch });
}
