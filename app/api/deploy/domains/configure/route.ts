import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DomainProvider } from "@/models/DomainProvider";
import { DeployServer } from "@/models/DeployServer";
import { decrypt } from "@/lib/deploy/encryption";
import { createDnsAdapter } from "@/lib/deploy/dns";
import { sshExec } from "@/lib/deploy/ssh";

export async function POST(req: NextRequest) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { providerId, domain, zoneId, subdomain, serverId, recordType } = body as {
    providerId: string;
    domain: string;
    zoneId?: string;
    subdomain?: string; // e.g. "app" for app.example.com, empty for root
    serverId: string;
    recordType?: "A" | "CNAME";
  };

  if (!providerId || !domain || !serverId)
    return NextResponse.json({ message: "providerId, domain, and serverId are required" }, { status: 400 });

  const provider = await DomainProvider.findById(providerId);
  if (!provider)
    return NextResponse.json({ message: "Domain provider not found" }, { status: 404 });

  const server = await DeployServer.findById(serverId);
  if (!server)
    return NextResponse.json({ message: "Server not found" }, { status: 404 });

  try {
    // Get server's public IP
    let serverIp = server.ip;
    // If the stored IP is a hostname (not IP), detect public IP from server
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(serverIp)) {
      const ipResult = await sshExec(server, "curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}'");
      serverIp = ipResult.stdout.trim();
    }

    if (!serverIp || !/^\d+\.\d+\.\d+\.\d+$/.test(serverIp)) {
      return NextResponse.json({ message: `Could not determine server IP. Got: ${serverIp}` }, { status: 400 });
    }

    const creds = {
      apiKey: decrypt(provider.encryptedApiKey),
      apiSecret: provider.encryptedApiSecret ? decrypt(provider.encryptedApiSecret) : undefined,
      apiEmail: provider.encryptedApiEmail ? decrypt(provider.encryptedApiEmail) : undefined,
    };

    const adapter = createDnsAdapter(provider.provider, creds);

    const recordName = subdomain?.trim() || "@";
    const fullDomain = recordName === "@" ? domain : `${recordName}.${domain}`;
    const type = recordType || "A";

    await adapter.upsertRecord(
      domain,
      {
        type,
        name: recordName,
        value: serverIp,
        ttl: 300, // 5 min for fast propagation
      },
      zoneId
    );

    return NextResponse.json({
      ok: true,
      fullDomain,
      serverIp,
      recordType: type,
      message: `${type} record created: ${fullDomain} → ${serverIp}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to configure domain" },
      { status: 500 }
    );
  }
}
