import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { type } = await req.json();
        await connectDB();

        const userId = user.userId;

        if (type === "leads") {
            await User.findByIdAndUpdate(userId, { lastViewedLeadsAt: new Date() });
        } else if (type === "onboarding") {
            await User.findByIdAndUpdate(userId, { lastViewedOnboardingAt: new Date() });
        } else if (type === "plans") {
            await Plan.updateMany(
                {
                    viewedBy: { $ne: userId },
                    createdBy: { $ne: userId },
                    $or: [
                        { visibility: { $in: ["org", "public"] } },
                        { sharedWith: userId },
                    ],
                },
                { $addToSet: { viewedBy: userId } }
            );
        } else if (type === "tasks") {
            await User.findByIdAndUpdate(userId, { lastViewedTasksAt: new Date() });
        } else if (type === "deployments") {
            await User.findByIdAndUpdate(userId, { lastViewedDeploymentsAt: new Date() });
        } else {
            return NextResponse.json({ message: "Invalid type" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ message: "Error updating" }, { status: 500 });
    }
}
