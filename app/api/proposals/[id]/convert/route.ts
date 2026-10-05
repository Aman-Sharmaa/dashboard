import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import { Project } from "@/models/Project";
import { ProjectPayment } from "@/models/ProjectPayment";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Types } from "mongoose";

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

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // 1. Fetch Proposal
        const proposal = await Proposal.findById(params.id);
        if (!proposal) {
            return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
        }

        // Check if already converted
        if (proposal.convertedProjectId) {
            return NextResponse.json({
                message: "Already converted",
                projectId: proposal.convertedProjectId
            });
        }

        if (proposal.status !== "accepted") {
            return NextResponse.json({ message: "Proposal must be accepted before converting" }, { status: 400 });
        }

        // 2. Create Project
        const newProject = await Project.create({
            name: proposal.title,
            client: proposal.client,
            description: `Converted from Proposal: ${proposal.title}`,
            status: "active",
            budget: proposal.totalAmount,
            assignedMembers: [user.userId], // Assign creator as member
            manager: user.userId,
        });

        // 3. Map Phases
        const paymentPhases = proposal.phases.map((p) => ({
            name: p.name,
            percentage: proposal.totalAmount > 0 ? (p.amount / proposal.totalAmount) * 100 : 0,
            amount: p.amount,
            remark: p.details || "",
            status: "draft",
            isGstBill: false, // Default
        }));

        // 4. Create Project Payment
        await ProjectPayment.create({
            client: proposal.client,
            project: newProject._id,
            totalAmount: proposal.totalAmount,
            currency: proposal.currency,
            billingCycle: "phases",
            phases: paymentPhases,
            status: "draft",
            notes: `Generated from Proposal: ${proposal.title}`,
        });

        // 5. Update proposal with project reference
        await Proposal.findByIdAndUpdate(params.id, {
            convertedProjectId: newProject._id
        });

        return NextResponse.json({
            message: "Converted successfully",
            projectId: newProject._id
        });

    } catch (err) {
        console.error("Conversion Error:", err);
        return NextResponse.json({ message: "Error converting proposal" }, { status: 500 });
    }
}
