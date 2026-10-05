import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DomainProvider } from "@/models/DomainProvider";
import { encrypt, decrypt } from "@/lib/deploy/encryption";
import { createDnsAdapter } from "@/lib/deploy/dns";

export async function GET() {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const providers = await DomainProvider.find()
    .select("-encryptedApiKey -encryptedApiSecret -encryptedApiEmail")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    providers: providers.map((p) => ({
      id: String(p._id),
      name: p.name,
      provider: p.provider,
      domainCount: p.cachedDomains?.length || 0,
      cachedDomains: p.cachedDomains || [],
      cachedDomainsAt: p.cachedDomainsAt,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, provider, apiKey, apiSecret, apiEmail } = body;

  if (!name?.trim() || !provider || !apiKey?.trim())
    return NextResponse.json({ message: "Name, provider, and API key are required" }, { status: 400 });

  const validProviders = ["cloudflare", "godaddy", "namecheap", "hostinger"];
  if (!validProviders.includes(provider))
    return NextResponse.json({ message: `Invalid provider. Use: ${validProviders.join(", ")}` }, { status: 400 });

  // Verify credentials by listing domains
  try {
    const adapter = createDnsAdapter(provider, {
      apiKey: apiKey.trim(),
      apiSecret: apiSecret?.trim(),
      apiEmail: apiEmail?.trim(),
    });
    const domains = await adapter.listDomains();

    const doc = await DomainProvider.create({
      name: name.trim(),
      provider,
      encryptedApiKey: encrypt(apiKey.trim()),
      encryptedApiSecret: apiSecret?.trim() ? encrypt(apiSecret.trim()) : undefined,
      encryptedApiEmail: apiEmail?.trim() ? encrypt(apiEmail.trim()) : undefined,
      cachedDomains: domains,
      cachedDomainsAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      provider: {
        id: String(doc._id),
        name: doc.name,
        provider: doc.provider,
        domainCount: domains.length,
        cachedDomains: domains,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Verification failed: ${err.message}` },
      { status: 400 }
    );
  }
}
