import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployProject } from "@/models/DeployProject";
import { deployProject, DEPLOY_STEPS } from "@/lib/deploy/deployer";
import { sendMail } from "@/lib/mailer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireDeploymentsAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id);
  if (!project) {
    return new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let action: "deploy" | "redeploy" = "deploy";
  try {
    const body = await req.json();
    if (body?.action === "redeploy") action = "redeploy";
  } catch {}
  const isRedeploy = action === "redeploy";
  const streamSteps = isRedeploy
    ? DEPLOY_STEPS.filter((s) => s.id !== "nginx" && s.id !== "ssl")
    : DEPLOY_STEPS;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {}
      };

      send({ type: "init", steps: streamSteps });

      try {
        const result = await deployProject(
          project,
          admin!.email,
          (update) => send({ type: "step", ...update }),
          (line) => send({ type: "log", line }),
          {
            action,
            skipDomainSetup: isRedeploy,
            skipSslSetup: isRedeploy,
          }
        );

        send({
          type: "complete",
          success: result.success,
          logId: result.logId,
        });

        if (result.success) {
          const updatedProject = await DeployProject.findById(id).lean();
          sendMail({
            to: admin!.email,
            subject: `Deployment Successful: ${project.name}`,
            html: `<h2>Deployment Completed Successfully</h2>
              <p><strong>App:</strong> ${project.name}</p>
              <p><strong>Domain:</strong> ${project.domain || "N/A"}</p>
              <p><strong>Branch:</strong> ${project.branch}</p>
              <p><strong>Commit:</strong> ${(updatedProject as any)?.lastDeployCommit || "N/A"}</p>
              <p><strong>Deployed at:</strong> ${new Date().toLocaleString("en-IN")}</p>
              <p>Your application has been deployed successfully.</p>`,
          }).catch(() => {});
        }
      } catch (err: any) {
        send({
          type: "complete",
          success: false,
          error: err.message,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
