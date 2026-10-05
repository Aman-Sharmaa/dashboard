import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { PlanPage } from "@/models/PlanPage";
import { verifyToken } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
        await connectDB();

        const { searchParams } = new URL(req.url);
        const isPinnedToSidebar = searchParams.get("isPinnedToSidebar") === "true";

        const query: any = {};
        if (isPinnedToSidebar) query.isPinnedToSidebar = true;

        // Visibility rules
        if (auth.role !== "admin") {
            query.$or = [
                { visibility: "org" },
                { createdBy: auth.userId },
                { sharedWith: auth.userId }
            ];
        }

        const pages = await PlanPage.find(query).sort({ updatedAt: -1 }).lean();

        return NextResponse.json({ pages: pages.map(p => ({ ...p, _id: String(p._id) })) });
    } catch (err) {
        console.error("PlanPages GET error:", err);
        return NextResponse.json(
            { message: err instanceof Error ? err.message : "Failed to load pages." },
            { status: 500 }
        );
    }
}
