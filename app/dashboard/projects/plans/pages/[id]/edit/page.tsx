"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlanPageEditor } from "@/components/plan-page-editor";

export default function EditPlanPage() {
    const router = useRouter();
    const params = useParams();
    const [page, setPage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPage() {
            try {
                const res = await fetch(`/api/plans/pages/${params?.id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to fetch page");
                setPage(data.page);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to load page");
                router.push("/dashboard/projects/plans");
            } finally {
                setLoading(false);
            }
        }
        if (params?.id) fetchPage();
    }, [params?.id, router]);

    async function onSubmit(values: any) {
        const res = await fetch(`/api/plans/pages/${params?.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Failed to update");
        }
        toast.success("Page updated");
        router.push(`/view-page/${params?.id}`);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/view-page/${params?.id}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Edit Page</h2>
                    <p className="text-sm text-muted-foreground">Edit content and settings for this plan page</p>
                </div>
            </div>
            <PlanPageEditor
                initialValues={{
                    name: page.name,
                    url: page.url,
                    content: page.content,
                    visibility: page.visibility || "me",
                }}
                onSubmit={onSubmit}
                cancelHref={`/view-page/${params?.id}`}
            />
        </div>
    );
}
