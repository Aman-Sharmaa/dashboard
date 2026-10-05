/**
 * Provider-agnostic DNS management.
 *
 * Supports: Cloudflare, GoDaddy, Namecheap, Hostinger.
 * Each adapter implements listDomains / getRecords / upsertRecord / deleteRecord.
 */

export interface DnsRecord {
  id?: string;
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS";
  name: string; // e.g. "app" for app.example.com, "@" for root
  value: string;
  ttl?: number;
  proxied?: boolean; // Cloudflare proxy toggle
}

export interface DomainInfo {
  domain: string;
  zoneId?: string;
}

export interface DnsAdapter {
  listDomains(): Promise<DomainInfo[]>;
  getRecords(domain: string, zoneId?: string): Promise<DnsRecord[]>;
  upsertRecord(domain: string, record: DnsRecord, zoneId?: string): Promise<void>;
  deleteRecord(domain: string, recordId: string, zoneId?: string): Promise<void>;
}

// ─── Cloudflare ──────────────────────────────────

export class CloudflareAdapter implements DnsAdapter {
  private baseUrl = "https://api.cloudflare.com/client/v4";
  private headers: Record<string, string>;

  constructor(apiToken: string, email?: string) {
    if (email) {
      this.headers = {
        "X-Auth-Email": email,
        "X-Auth-Key": apiToken,
        "Content-Type": "application/json",
      };
    } else {
      this.headers = {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      };
    }
  }

  async listDomains(): Promise<DomainInfo[]> {
    const domains: DomainInfo[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${this.baseUrl}/zones?per_page=50&page=${page}`,
        { headers: this.headers }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.errors?.[0]?.message || "Cloudflare API error");
      for (const z of data.result || []) {
        domains.push({ domain: z.name, zoneId: z.id });
      }
      if (page >= (data.result_info?.total_pages || 1)) break;
      page++;
    }
    return domains;
  }

  async getRecords(domain: string, zoneId?: string): Promise<DnsRecord[]> {
    const zid = zoneId || (await this.resolveZoneId(domain));
    const res = await fetch(
      `${this.baseUrl}/zones/${zid}/dns_records?per_page=100`,
      { headers: this.headers }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to fetch records");
    return (data.result || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name === domain ? "@" : r.name.replace(`.${domain}`, ""),
      value: r.content,
      ttl: r.ttl,
      proxied: r.proxied,
    }));
  }

  async upsertRecord(domain: string, record: DnsRecord, zoneId?: string): Promise<void> {
    const zid = zoneId || (await this.resolveZoneId(domain));
    const fullName = record.name === "@" ? domain : `${record.name}.${domain}`;

    // Check if record already exists
    const existingRes = await fetch(
      `${this.baseUrl}/zones/${zid}/dns_records?type=${record.type}&name=${fullName}`,
      { headers: this.headers }
    );
    const existingData = await existingRes.json();
    const existing = existingData.result?.[0];

    const body = {
      type: record.type,
      name: fullName,
      content: record.value,
      ttl: record.ttl || 1, // 1 = auto
      proxied: record.proxied ?? false,
    };

    if (existing) {
      const res = await fetch(
        `${this.baseUrl}/zones/${zid}/dns_records/${existing.id}`,
        { method: "PATCH", headers: this.headers, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to update record");
    } else {
      const res = await fetch(
        `${this.baseUrl}/zones/${zid}/dns_records`,
        { method: "POST", headers: this.headers, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to create record");
    }
  }

  async deleteRecord(domain: string, recordId: string, zoneId?: string): Promise<void> {
    const zid = zoneId || (await this.resolveZoneId(domain));
    const res = await fetch(
      `${this.baseUrl}/zones/${zid}/dns_records/${recordId}`,
      { method: "DELETE", headers: this.headers }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0]?.message || "Failed to delete record");
  }

  private async resolveZoneId(domain: string): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/zones?name=${domain}`,
      { headers: this.headers }
    );
    const data = await res.json();
    const zone = data.result?.[0];
    if (!zone) throw new Error(`Zone not found for ${domain}`);
    return zone.id;
  }
}

// ─── GoDaddy ─────────────────────────────────────
// GoDaddy restricts API access: production keys require 50+ domains on the account.
// OTE (test) keys use a different base URL. We try production first, then OTE.

export class GoDaddyAdapter implements DnsAdapter {
  private headers: Record<string, string>;
  private resolvedBase: string | null = null;

  constructor(apiKey: string, apiSecret: string) {
    this.headers = {
      Authorization: `sso-key ${apiKey}:${apiSecret}`,
      "Content-Type": "application/json",
    };
  }

  private async getBase(): Promise<string> {
    if (this.resolvedBase) return this.resolvedBase;

    // Try production first
    const prodUrl = "https://api.godaddy.com/v1";
    const prodRes = await fetch(`${prodUrl}/domains?limit=1`, { headers: this.headers }).catch(() => null);
    if (prodRes?.ok) {
      this.resolvedBase = prodUrl;
      return prodUrl;
    }

    // Try OTE (test environment)
    const oteUrl = "https://api.ote-godaddy.com/v1";
    const oteRes = await fetch(`${oteUrl}/domains?limit=1`, { headers: this.headers }).catch(() => null);
    if (oteRes?.ok) {
      this.resolvedBase = oteUrl;
      return oteUrl;
    }

    // Both failed ~ read the actual error from production
    if (prodRes) {
      const err = await prodRes.json().catch(() => ({}));
      const code = err.code || "";
      const msg = err.message || "";
      if (prodRes.status === 403 || code === "ACCESS_DENIED" || msg.includes("not allowed")) {
        throw new Error(
          `GoDaddy API access denied. Common causes:\n` +
          `• Your account needs 50+ domains for production API access\n` +
          `• You may be using an OTE (test) key ~ generate a Production key at developer.godaddy.com\n` +
          `• GoDaddy has restricted API access for some account types ~ consider using Cloudflare DNS instead`
        );
      }
      if (prodRes.status === 401) {
        throw new Error("GoDaddy authentication failed ~ check your API Key and Secret are correct");
      }
      throw new Error(msg || `GoDaddy API error: ${prodRes.status}`);
    }

    throw new Error("Could not connect to GoDaddy API ~ check your internet connection");
  }

  async listDomains(): Promise<DomainInfo[]> {
    const base = await this.getBase();
    const res = await fetch(`${base}/domains?limit=500`, { headers: this.headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GoDaddy API error: ${res.status}`);
    }
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((d: any) => ({ domain: d.domain }));
  }

  async getRecords(domain: string): Promise<DnsRecord[]> {
    const base = await this.getBase();
    const res = await fetch(`${base}/domains/${domain}/records`, { headers: this.headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch records for ${domain}`);
    }
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((r: any) => ({
      type: r.type,
      name: r.name,
      value: r.data,
      ttl: r.ttl,
    }));
  }

  async upsertRecord(domain: string, record: DnsRecord): Promise<void> {
    const base = await this.getBase();
    const name = record.name === "@" ? "@" : record.name;
    const res = await fetch(
      `${base}/domains/${domain}/records/${record.type}/${name}`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify([{ data: record.value, ttl: record.ttl || 600 }]),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to set ${record.type} record on GoDaddy`);
    }
  }

  async deleteRecord(domain: string, _recordId: string): Promise<void> {
    throw new Error("GoDaddy does not support individual record deletion via API ~ remove manually");
  }
}

// ─── Namecheap ───────────────────────────────────

export class NamecheapAdapter implements DnsAdapter {
  private baseUrl = "https://api.namecheap.com/xml.response";
  private apiUser: string;
  private apiKey: string;
  private clientIp: string;

  constructor(apiKey: string, apiUser: string, clientIp = "0.0.0.0") {
    this.apiKey = apiKey;
    this.apiUser = apiUser;
    this.clientIp = clientIp;
  }

  private params(cmd: string, extra: Record<string, string> = {}): string {
    const p = new URLSearchParams({
      ApiUser: this.apiUser,
      ApiKey: this.apiKey,
      UserName: this.apiUser,
      ClientIp: this.clientIp,
      Command: cmd,
      ...extra,
    });
    return `${this.baseUrl}?${p.toString()}`;
  }

  async listDomains(): Promise<DomainInfo[]> {
    const res = await fetch(this.params("namecheap.domains.getList", { PageSize: "100" }));
    const text = await res.text();
    const domains: DomainInfo[] = [];
    const regex = /Name="([^"]+)"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      domains.push({ domain: match[1] });
    }
    return domains;
  }

  async getRecords(domain: string): Promise<DnsRecord[]> {
    const parts = domain.split(".");
    const sld = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];
    const res = await fetch(this.params("namecheap.domains.dns.getHosts", { SLD: sld, TLD: tld }));
    const text = await res.text();
    const records: DnsRecord[] = [];
    const hostRegex = /HostId="[^"]*"\s+Name="([^"]*)"\s+Type="([^"]*)"\s+Address="([^"]*)"\s+.*?TTL="(\d+)"/g;
    let match;
    while ((match = hostRegex.exec(text)) !== null) {
      records.push({ name: match[1], type: match[2] as DnsRecord["type"], value: match[3], ttl: parseInt(match[4]) });
    }
    return records;
  }

  async upsertRecord(domain: string, record: DnsRecord): Promise<void> {
    // Namecheap requires setting ALL records at once; fetch existing, merge, then set
    const existing = await this.getRecords(domain);
    const idx = existing.findIndex(
      (r) => r.type === record.type && r.name === record.name
    );
    if (idx >= 0) {
      existing[idx] = record;
    } else {
      existing.push(record);
    }

    const parts = domain.split(".");
    const sld = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];

    const params: Record<string, string> = { SLD: sld, TLD: tld };
    existing.forEach((r, i) => {
      params[`HostName${i + 1}`] = r.name;
      params[`RecordType${i + 1}`] = r.type;
      params[`Address${i + 1}`] = r.value;
      params[`TTL${i + 1}`] = String(r.ttl || 1800);
    });

    const res = await fetch(this.params("namecheap.domains.dns.setHosts", params));
    const text = await res.text();
    if (text.includes('Status="ERROR"')) {
      const errMatch = text.match(/Number="([^"]*)".*?<(Description|Text)>([^<]*)/);
      throw new Error(errMatch?.[3] || "Namecheap API error");
    }
  }

  async deleteRecord(domain: string, _recordId: string): Promise<void> {
    throw new Error("Use upsertRecord to manage Namecheap records (they must be set all-at-once)");
  }
}

// ─── Hostinger ───────────────────────────────────
// Hostinger's DNS API (v1). Auth: Bearer token.

export class HostingerAdapter implements DnsAdapter {
  private baseUrl = "https://api.hostinger.com/v1";
  private headers: Record<string, string>;

  constructor(apiToken: string) {
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };
  }

  async listDomains(): Promise<DomainInfo[]> {
    const res = await fetch(`${this.baseUrl}/dns`, { headers: this.headers });
    if (!res.ok) throw new Error(`Hostinger API error: ${res.status}`);
    const data = await res.json();
    return (data || []).map((d: any) => ({ domain: d.domain || d.name }));
  }

  async getRecords(domain: string): Promise<DnsRecord[]> {
    const res = await fetch(`${this.baseUrl}/dns/${domain}/records`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch records for ${domain}`);
    const data = await res.json();
    return (data || []).map((r: any) => ({
      id: r.id ? String(r.id) : undefined,
      type: r.type,
      name: r.name || r.host || "@",
      value: r.content || r.value || r.data,
      ttl: r.ttl,
    }));
  }

  async upsertRecord(domain: string, record: DnsRecord): Promise<void> {
    const body = {
      type: record.type,
      name: record.name === "@" ? "" : record.name,
      content: record.value,
      ttl: record.ttl || 14400,
    };
    // Try to find existing and update, or create new
    const existing = await this.getRecords(domain);
    const match = existing.find(
      (r) => r.type === record.type && (r.name === record.name || (r.name === "" && record.name === "@"))
    );
    if (match?.id) {
      const res = await fetch(`${this.baseUrl}/dns/${domain}/records/${match.id}`, {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to update record on Hostinger`);
    } else {
      const res = await fetch(`${this.baseUrl}/dns/${domain}/records`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to create record on Hostinger`);
    }
  }

  async deleteRecord(domain: string, recordId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/dns/${domain}/records/${recordId}`, {
      method: "DELETE",
      headers: this.headers,
    });
    if (!res.ok) throw new Error("Failed to delete record on Hostinger");
  }
}

// ─── Factory ─────────────────────────────────────

export function createDnsAdapter(
  provider: string,
  credentials: { apiKey: string; apiSecret?: string; apiEmail?: string }
): DnsAdapter {
  switch (provider) {
    case "cloudflare":
      return new CloudflareAdapter(credentials.apiKey, credentials.apiEmail);
    case "godaddy":
      if (!credentials.apiSecret) throw new Error("GoDaddy requires API Key + Secret");
      return new GoDaddyAdapter(credentials.apiKey, credentials.apiSecret);
    case "namecheap":
      if (!credentials.apiSecret) throw new Error("Namecheap requires API Key + Username");
      return new NamecheapAdapter(credentials.apiKey, credentials.apiSecret);
    case "hostinger":
      return new HostingerAdapter(credentials.apiKey);
    default:
      throw new Error(`Unsupported DNS provider: ${provider}`);
  }
}
