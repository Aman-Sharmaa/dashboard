import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectDetailClient } from "@/components/project-detail-client";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProjectPage(props: Props) {
    const params = await props.params;
    await connectDB();

    const project = await Project.findById(params.id)
        .populate("assignedMembers", "name email")
        .populate("client", "name companyName email")
        .lean();

    if (!project) {
        notFound();
    }

    const client = project.client as any;

    const projectData = {
        id: String(project._id),
        client: {
            id: String(client._id),
            name: client.name || "",
            companyName: client.companyName || "",
            email: client.email || "",
        },
        name: project.name,
        description: project.description || "",
        startDate: project.startDate ? project.startDate.toISOString() : null,
        endDate: project.endDate ? project.endDate.toISOString() : null,
        maintenanceStartDate: project.maintenanceStartDate ? project.maintenanceStartDate.toISOString() : null,
        maintenanceEndDate: project.maintenanceEndDate ? project.maintenanceEndDate.toISOString() : null,
        assignedMembers: (project.assignedMembers as any[])?.map((m) => ({
            id: String(m._id),
            name: m.name,
            email: m.email,
        })) || [],
        status: project.status,
        budget: (project as any).budget,
        domains: (project as any).domains || [],
        isPinned: (project as any).isPinned || false,
        isPinnedToSidebar: (project as any).isPinnedToSidebar || false,
        createdAt: project.createdAt,
    };

    return (
        <ProjectDetailClient
            project={projectData}
            clientId={String(client._id)}
            isAdmin={true}
            canEdit={true}
        />
    );
}
