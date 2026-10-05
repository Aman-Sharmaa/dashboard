"use server";

import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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

export async function markPlanAsViewed(planId: string) {
    try {
        const user = await getAuthUser();
        if (!user) return;

        await connectDB();
        await Plan.findByIdAndUpdate(planId, {
            $addToSet: { viewedBy: user.userId }
        });

        revalidatePath(`/dashboard/projects/plans/${planId}`);
        // Also revalidate sidebar counts if we had a tag for it, but client polling handles it
    } catch (err) {
        console.error("Failed to mark plan as viewed", err);
    }
}
