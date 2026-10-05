import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeploySettings } from "@/models/DeploySettings";
import { decrypt } from "@/lib/deploy/encryption";
import { fetchOrgs, fetchRepos, fetchBranches, verifyToken as verifyGhToken } from "@/lib/deploy/github";

async function getToken(): Promise<string | null> {
  const settings = await DeploySettings.findOne().lean();
  if (!settings?.encryptedGithubToken) return null;
  try {
    return decrypt(settings.encryptedGithubToken);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const token = await getToken();
  if (!token) return NextResponse.json({ message: "GitHub token not configured" }, { status: 400 });

  const sp = new URL(req.url).searchParams;
  const action = sp.get("action");

  try {
    switch (action) {
      case "orgs": {
        const orgs = await fetchOrgs(token);
        return NextResponse.json({ orgs });
      }
      case "repos": {
        const org = sp.get("org") || undefined;
        const repos = await fetchRepos(token, org);
        return NextResponse.json({ repos });
      }
      case "branches": {
        const owner = sp.get("owner");
        const repo = sp.get("repo");
        if (!owner || !repo) return NextResponse.json({ message: "owner and repo required" }, { status: 400 });
        const branches = await fetchBranches(token, owner, repo);
        return NextResponse.json({ branches });
      }
      case "verify": {
        const user = await verifyGhToken(token);
        return NextResponse.json({ connected: !!user, user });
      }
      default:
        return NextResponse.json({ message: "Use ?action=orgs|repos|branches|verify" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "GitHub API error" }, { status: 502 });
  }
}
