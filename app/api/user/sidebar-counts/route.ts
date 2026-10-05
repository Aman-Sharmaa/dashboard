import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { Lead } from "@/models/Lead";
import { ClientOnboardingSubmission } from "@/models/ClientOnboardingSubmission";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { Attendance } from "@/models/Attendance";
import { DeployProject } from "@/models/DeployProject";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { grantsFromUserDoc, employeeHasFeatureAdmin } from "@/lib/employee-feature-grants";

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
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        await connectDB();

        const userId = user.userId;
        const userDoc = await User.findById(userId)
            .select(
                "lastViewedLeadsAt lastViewedOnboardingAt lastViewedTasksAt lastViewedDeploymentsAt role featureAccess featureAdminFor featureReadOnlyFor"
            )
            .lean();

        // Plans: visible to me, not created by me, not viewed by me
        const unviewedPlansCount = await Plan.countDocuments({
            viewedBy: { $ne: userId },
            createdBy: { $ne: userId },
            $or: [
                { visibility: { $in: ["org", "public"] } },
                { sharedWith: userId },
            ],
        });

        // Leads: only count leads created after the user last visited the leads page
        let newLeadsCount = 0;
        if (userDoc?.lastViewedLeadsAt) {
            newLeadsCount = await Lead.countDocuments({
                createdAt: { $gt: userDoc.lastViewedLeadsAt },
            });
        }

        // Onboarding: only count pending submissions created after the user last visited clients
        let pendingOnboardingCount = 0;
        if (userDoc?.lastViewedOnboardingAt) {
            pendingOnboardingCount = await ClientOnboardingSubmission.countDocuments({
                status: "pending",
                createdAt: { $gt: userDoc.lastViewedOnboardingAt },
            });
        }

        // Tasks: count task_assigned notifications created after user last visited /dashboard/todo
        const taskFilter: Record<string, unknown> = {
            user: userId,
            type: "task_assigned",
        };
        if (userDoc?.lastViewedTasksAt) {
            taskFilter.createdAt = { $gt: userDoc.lastViewedTasksAt };
        }
        const newTasksCount = await Notification.countDocuments(taskFilter);

        // Pending leaves: for admins, count attendance records with status=leave and approvalStatus=pending
        let pendingLeavesCount = 0;
        if ((userDoc as any)?.role === "admin") {
            pendingLeavesCount = await Attendance.countDocuments({
                status: "leave",
                approvalStatus: "pending",
            });
        }

        // Pending deployment commits: same visibility as Deployment Manager (global admin or deployments feature admin)
        let pendingCommitsCount = 0;
        const grants = grantsFromUserDoc(userDoc as any);
        const canSeeDeploymentAlerts =
            user.role === "admin" || employeeHasFeatureAdmin(user.role as any, grants, "deployments");
        if (canSeeDeploymentAlerts) {
            const commitFilter: Record<string, unknown> = {
                latestCommitSha: { $exists: true, $ne: "" },
                $expr: { $ne: ["$latestCommitSha", "$lastDeployCommit"] },
            };
            if ((userDoc as any)?.lastViewedDeploymentsAt) {
                commitFilter.latestCommitAt = { $gt: (userDoc as any).lastViewedDeploymentsAt };
            }
            pendingCommitsCount = await DeployProject.countDocuments(commitFilter);
        }

        return NextResponse.json({
            counts: {
                plans: unviewedPlansCount,
                leads: newLeadsCount,
                onboarding: pendingOnboardingCount,
                tasks: newTasksCount,
                pendingLeaves: pendingLeavesCount,
                pendingCommits: pendingCommitsCount,
            },
        });
    } catch {
        return NextResponse.json({ counts: { plans: 0, leads: 0, onboarding: 0, tasks: 0, pendingLeaves: 0, pendingCommits: 0 } });
    }
}
