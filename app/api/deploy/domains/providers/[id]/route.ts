import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DomainProvider } from "@/models/DomainProvider";
import { decrypt } from "@/lib/deploy/encryption";
import { createDnsAdapter } from "@/lib/deploy/dns";

function getCredentials(provider: any) {
  return {
    apiKey: decrypt(provider.encryptedApiKey),
    apiSecret: provider.encryptedApiSecret ? decrypt(provider.encryptedApiSecret) : undefined,
    apiEmail: provider.encryptedApiEmail ? decrypt(provider.encryptedApiEmail) : undefined,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const provider = await DomainProvider.findById(id);
  if (!provider)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: String(provider._id),
    name: provider.name,
    provider: provider.provider,
    cachedDomains: provider.cachedDomains || [],
    cachedDomainsAt: provider.cachedDomainsAt,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const provider = await DomainProvider.findById(id);
  if (!provider)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "refresh-domains": {
      try {
        const creds = getCredentials(provider);
        const adapter = createDnsAdapter(provider.provider, creds);
        const domains = await adapter.listDomains();
        provider.cachedDomains = domains;
        provider.cachedDomainsAt = new Date();
        await provider.save();
        return NextResponse.json({ ok: true, domains });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "get-records": {
      const { domain, zoneId } = body;
      if (!domain)
        return NextResponse.json({ message: "Domain required" }, { status: 400 });
      try {
        const creds = getCredentials(provider);
        const adapter = createDnsAdapter(provider.provider, creds);
        const records = await adapter.getRecords(domain, zoneId);
        return NextResponse.json({ ok: true, records });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "set-record": {
      const { domain, zoneId, record } = body;
      if (!domain || !record)
        return NextResponse.json({ message: "Domain and record required" }, { status: 400 });
      try {
        const creds = getCredentials(provider);
        const adapter = createDnsAdapter(provider.provider, creds);
        await adapter.upsertRecord(domain, record, zoneId);
        return NextResponse.json({ ok: true });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "delete-record": {
      const { domain, zoneId, recordId } = body;
      if (!domain || !recordId)
        return NextResponse.json({ message: "Domain and recordId required" }, { status: 400 });
      try {
        const creds = getCredentials(provider);
        const adapter = createDnsAdapter(provider.provider, creds);
        await adapter.deleteRecord(domain, recordId, zoneId);
        return NextResponse.json({ ok: true });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    default:
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  await DomainProvider.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
