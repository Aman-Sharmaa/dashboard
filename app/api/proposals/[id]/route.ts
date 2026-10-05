import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Client } from "@/models/Client";

// Ensure models
void Client;

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

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        await connectDB();
        const proposal = await Proposal.findById(params.id)
            .populate("client", "name companyName companyAddress email phone")
            .populate("owner", "name email")
            .lean();

        if (!proposal) return NextResponse.json({ message: "Not found" }, { status: 404 });

        return NextResponse.json({
            proposal: {
                ...proposal,
                id: String(proposal._id),
                client: proposal.client ? { ...proposal.client, id: String((proposal.client as any)._id) } : null,
                owner: proposal.owner ? { ...proposal.owner, name: (proposal.owner as any).name, email: (proposal.owner as any).email } : null,
            }
        });
    } catch (err) {
        return NextResponse.json({ message: "Error" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        await connectDB();

        const proposal = await Proposal.findByIdAndUpdate(params.id, body, { new: true });
        if (!proposal) return NextResponse.json({ message: "Not found" }, { status: 404 });

        return NextResponse.json({ proposal });
    } catch (err) {
        return NextResponse.json({ message: "Error updating" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        await connectDB();
        await Proposal.findByIdAndDelete(params.id);

        return NextResponse.json({ message: "Deleted" });
    } catch (err) {
        return NextResponse.json({ message: "Error deleting" }, { status: 500 });
    }
}
