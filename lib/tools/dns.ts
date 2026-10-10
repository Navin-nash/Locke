import { parse } from "tldts";
import { z } from "zod";
import { toolErr, toolOk, type ToolResult } from "./domain-result";
import { getWithRetry, type GetDeps } from "./json-get";

export const DnsInput = z.object({ domain: z.string().min(1).max(253) });

export type DmarcPolicy = "none" | "quarantine" | "reject";
export type DnsData = { mx: string[]; spf?: string; dmarcPolicy?: DmarcPolicy };

const DohBody = z.object({
  Status: z.number(),
  Answer: z.array(z.object({ type: z.number(), data: z.string() })).optional(),
});

export function parseDmarcPolicy(txt: string): DmarcPolicy | undefined {
  if (!/^\s*v=DMARC1\b/i.test(txt)) return undefined;
  const m = /(?:^|;)\s*p=(none|quarantine|reject)\s*(?:;|$)/i.exec(txt);
  return m?.[1]?.toLowerCase() as DmarcPolicy | undefined;
}

// DoH TXT data is one or more quoted chunks: "a" "b" -> ab
const joinTxt = (data: string) => [...data.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("") || data;

async function query(name: string, type: "MX" | "TXT", deps: GetDeps): Promise<ToolResult<{ type: number; data: string }[]>> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await getWithRetry(url, { timeoutMs: 3000, headers: { accept: "application/dns-json" }, ...deps });
  if (!res.ok) return res;
  try {
    const body = DohBody.parse(JSON.parse(res.data.text));
    return toolOk(body.Answer ?? []);
  } catch {
    return toolErr("parse", "DNS-over-HTTPS response was not valid", false);
  }
}

/** NXDOMAIN or no records is an empty result. A failed query is an error ("could not check"), never "no mail". */
export async function dnsRecords(input: z.infer<typeof DnsInput>, deps: GetDeps = {}): Promise<ToolResult<DnsData>> {
  const parsed = DnsInput.safeParse(input);
  const domain = parsed.success ? parse(parsed.data.domain.trim().toLowerCase()).domain : null;
  if (!domain) return toolErr("invalid_input", "domain is not valid", false);

  const [mx, txt, dmarc] = await Promise.all([
    query(domain, "MX", deps),
    query(domain, "TXT", deps),
    query(`_dmarc.${domain}`, "TXT", deps),
  ]);
  for (const r of [mx, txt, dmarc]) if (!r.ok) return r;
  if (!mx.ok || !txt.ok || !dmarc.ok) return toolErr("http", "dns query failed", true); // type narrowing only

  const mxHosts = mx.data
    .filter((a) => a.type === 15)
    .map((a) => (a.data.split(/\s+/)[1] ?? "").replace(/\.$/, ""))
    .filter(Boolean);
  const spf = txt.data.map((a) => joinTxt(a.data)).find((t) => /^v=spf1\b/i.test(t));
  const dmarcPolicy = dmarc.data.map((a) => parseDmarcPolicy(joinTxt(a.data))).find(Boolean);
  return toolOk({ mx: mxHosts, ...(spf ? { spf } : {}), ...(dmarcPolicy ? { dmarcPolicy } : {}) });
}
