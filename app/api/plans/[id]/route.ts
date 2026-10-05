import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { PlanPage } from "@/models/PlanPage";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { planSharedEmail } from "@/lib/email-templates";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Plan ID required." }, { status: 400 });

    const plan = await Plan.findById(id).lean();
    if (!plan) return NextResponse.json({ message: "Plan not found." }, { status: 404 });

    // Visibility check: "me" and "shared" plans require creator/sharedWith/admin
    if (auth.role !== "admin" && (plan.visibility === "me" || plan.visibility === "shared")) {
      const isCreator = String(plan.createdBy) === auth.userId;
      const isSharedWith = plan.sharedWith?.map(String).includes(auth.userId);
      if (!isCreator && !isSharedWith) {
        return NextResponse.json({ message: "You do not have permission to view this plan." }, { status: 403 });
      }
    }

    // Fetch sub-plans (immediate children)
    const subPlans = await Plan.find({ parentId: id }).sort({ order: 1, name: 1 }).lean();

    // Fetch pages (immediate documents)
    const pages = await PlanPage.find({ planId: id }).sort({ order: 1, name: 1 }).lean();

    return NextResponse.json({
      plan: { ...plan, _id: String(plan._id) },
      subPlans: subPlans.map((p: any) => ({ ...p, _id: String(p._id) })),
      pages: pages.map((p: any) => ({ ...p, _id: String(p._id) }))
    });
  } catch (err) {
    console.error("Plan GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to fetch plan details." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Plan ID required." }, { status: 400 });

    const plan = await Plan.findById(id);
    if (!plan) return NextResponse.json({ message: "Plan not found." }, { status: 404 });

    // Permission check: only admin or creator can edit
    if (auth.role !== "admin" && String(plan.createdBy) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to edit this plan." }, { status: 403 });
    }

    const body = await req.json();
    const previousSharedWith = (plan.sharedWith || []).map(String);

    if (body.name != null) plan.name = String(body.name).trim();
    if (body.visibility != null) plan.visibility = body.visibility;
    if (body.sharedWith != null) plan.sharedWith = body.sharedWith;
    if (body.order != null) plan.order = Number(body.order);
    if (body.parentId !== undefined) plan.parentId = body.parentId || null;
    if (body.isPinned !== undefined) (plan as any).isPinned = body.isPinned;
    if (body.isPinnedToSidebar !== undefined) (plan as any).isPinnedToSidebar = body.isPinnedToSidebar;

    await plan.save();

    // Notify newly shared users + send emails
    if (body.sharedWith != null) {
      try {
        const newSharedWith = (body.sharedWith as string[]).filter(
          (uid: string) => !previousSharedWith.includes(uid) && uid !== auth.userId
        );
        if (newSharedWith.length > 0) {
          await Notification.create(
            newSharedWith.map((uid: string) => ({
              user: uid,
              type: "plan_shared",
              title: "Plan shared with you",
              message: `"${plan.name}" has been shared with you.`,
              link: `/view-plan/${String(plan._id)}`,
              data: { planId: String(plan._id) },
            }))
          );

          const sharerUser = await User.findById(auth.userId).select("name email").lean();
          const sharerName = (sharerUser as any)?.name || auth.email || "Someone";

          const sharedUsers = await User.find({ _id: { $in: newSharedWith } })
            .select("email name")
            .lean();

          for (const su of sharedUsers) {
            try {
              await sendMail({
                to: su.email,
                subject: `Plan Shared: "${plan.name}"`,
                html: planSharedEmail({
                  recipientName: su.name || "there",
                  planName: plan.name,
                  sharedBy: sharerName,
                  planId: String(plan._id),
                }),
              });
            } catch {
              // Individual email failures should not block
            }
          }
        }
      } catch {
        // Notification errors should not block plan update
      }
    }

    // Notify when visibility changes to "org" (everyone can see it now)
    if (body.visibility === "org" && body.visibility !== plan.visibility) {
      // Already saved above, but org visibility means all users can see it
      // The viewedBy mechanism handles this via sidebar badge
    }

    return NextResponse.json({
      plan: {
        ...plan.toObject(),
        _id: String(plan._id),
      },
    });
  } catch (err) {
    console.error("Plan PUT error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to update plan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Plan ID required." }, { status: 400 });

    const plan = await Plan.findById(id);
    if (!plan) return NextResponse.json({ message: "Plan not found." }, { status: 404 });

    // Permission check: only admin or creator can delete
    if (auth.role !== "admin" && String(plan.createdBy) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to delete this plan." }, { status: 403 });
    }

    await PlanPage.deleteMany({ planId: id });
    await Plan.deleteMany({ parentId: id });
    await Plan.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Plan DELETE error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to delete plan." },
      { status: 500 }
    );
  }
}
