import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Client } from "@/models/Client";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Ensure models are registered
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await connectDB();

        const payment = await ProjectPayment.findById(id)
            .populate("client")
            .populate("project")
            .lean();

        if (!payment) {
            return NextResponse.json({ message: "Payment not found" }, { status: 404 });
        }

        // specific company profile for the user (owner)
        // assuming the admin user/owner has the company profile
        // IF the user is not admin, they might not see it, but let's assume admin access for payments
        const companyProfile = await CompanyProfile.findOne({ owner: user.userId }).lean();

        // If not found for this user, maybe try to find ANY company profile (single tenant app?)
        // For now stick to owner.

        return NextResponse.json({
            payment: {
                ...payment,
                id: String(payment._id),
            },
            client: payment.client, // populated
            companyProfile,
        });

    } catch (err) {
        console.error("Bill API Error:", err);
        return NextResponse.json(
            { message: err instanceof Error ? err.message : "Failed to load bill data" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const params = await props.params;
        const { id } = params;
        await connectDB();

        const body = await req.json();
        const { phaseId, invoiceDetails } = body;

        const payment = await ProjectPayment.findById(id);
        if (!payment) {
            return NextResponse.json({ message: "Payment not found" }, { status: 404 });
        }

        if (phaseId) {
            // Update specific phase
            const phase = payment.phases?.find((p: any) => p._id.toString() === phaseId);
            if (!phase) {
                return NextResponse.json({ message: "Phase not found" }, { status: 404 });
            }
            phase.invoiceDetails = invoiceDetails;
        } else {
            // Update main payment
            payment.invoiceDetails = invoiceDetails;
        }

        await payment.save();

        // Return updated payment
        const updated = await ProjectPayment.findById(id)
            .populate("client")
            .populate("project")
            .lean();

        return NextResponse.json({
            payment: {
                ...updated,
                id: String(updated!._id),
            },
            client: updated!.client,
        });

    } catch (err) {
        console.error("Bill Save Error:", err);
        return NextResponse.json(
            { message: err instanceof Error ? err.message : "Failed to save bill data" },
            { status: 500 }
        );
    }
}
