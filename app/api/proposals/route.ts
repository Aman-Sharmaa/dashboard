import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
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

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        await connectDB();

        // If admin, show all? Or just own? Let's show all for admin, own for others if needed.
        // For now assuming all visible to admin/employee in finance
        const proposals = await Proposal.find()
            .populate("client", "name companyName")
            .populate("owner", "email")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            proposals: proposals.map((p: any) => ({
                ...p,
                id: String(p._id),
                client: p.client ? { id: String(p.client._id), name: p.client.name, companyName: p.client.companyName } : null,
                owner: p.owner ? { id: String(p.owner._id), email: p.owner.email } : null,
            }))
        });

    } catch (err) {
        return NextResponse.json({ message: "Failed to fetch proposals" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        await connectDB();

        const proposal = await Proposal.create({
            ...body,
            owner: user.userId,
        });

        return NextResponse.json({ proposal }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Failed to create proposal" }, { status: 500 });
    }
}
