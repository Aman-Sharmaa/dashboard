import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { PlanPagesClient } from "@/components/plan-pages-client";
import { notFound } from "next/navigation";
import { markPlanAsViewed } from "./actions";

interface PlanPageProps {
    params: Promise<{
        id: string;
    }>;
}

async function getPlan(id: string) {
    await connectDB();
    const plan = await Plan.findById(id).lean();
    if (!plan) return null;
    return {
        ...plan,
        _id: String(plan._id),
    };
}

export default async function ViewPlanDocuments({ params }: PlanPageProps) {
    const { id } = await params;
    const plan = await getPlan(id);

    // Fire and forget (don't await to avoid blocking render too much, or await if fast)
    // Since it's a server component, we can just call it.
    markPlanAsViewed(id);

    if (!plan) {
        notFound();
    }

    return (
        <div className="p-4 md:p-8">
            <Suspense fallback={<div>Loading pages...</div>}>
                <PlanPagesClient planId={plan._id} planName={plan.name} />
            </Suspense>
        </div>
    );
}
