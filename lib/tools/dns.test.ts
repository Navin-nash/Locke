import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dnsRecords, parseDmarcPolicy } from "./dns";

const fixture = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");

const router = (map: Record<string, string>) => async (url: string | URL | Request) => {
  const u = new URL(String(url));
  const key = `${u.searchParams.get("type")}:${u.searchParams.get("name")}`;
  return new Response(map[key] ?? fixture("doh-nxdomain.json"), { status: 200 });
};

describe("parseDmarcPolicy", () => {
  it.each([
    ["v=DMARC1; p=reject; rua=mailto:x@y.z", "reject"],
    ["v=DMARC1;p=quarantine", "quarantine"],
    ["v=DMARC1; p=none", "none"],
    ["v=DMARC1; sp=reject", undefined],
    ["v=spf1 -all", undefined],
  ])("%s -> %s", (txt, expected) => {
    expect(parseDmarcPolicy(txt)).toBe(expected);
  });
});

describe("dnsRecords", () => {
  it("returns MX, SPF (joined TXT chunks), and DMARC policy via DoH", async () => {
    const f = router({
      "MX:acme.com": fixture("doh-mx.json"),
      "TXT:acme.com": fixture("doh-txt.json"),
      "TXT:_dmarc.acme.com": fixture("doh-dmarc.json"),
    });
    const r = await dnsRecords({ domain: "acme.com" }, { fetch: f });
    expect(r).toEqual({
      ok: true,
      data: { mx: ["mx1.acme.com", "mx2.acme.com"], spf: "v=spf1 include:_spf.google.com ~all", dmarcPolicy: "quarantine" },
    });
  });
  it("NXDOMAIN yields empty records, not an error", async () => {
    const r = await dnsRecords({ domain: "acme.com" }, { fetch: router({}) });
    expect(r).toEqual({ ok: true, data: { mx: [] } });
  });
  it("sends accept: application/dns-json to cloudflare", async () => {
    const seen: { url: string; accept: string | null }[] = [];
    const f = async (url: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(url), accept: new Headers(init?.headers).get("accept") });
      return new Response(fixture("doh-nxdomain.json"));
    };
    await dnsRecords({ domain: "acme.com" }, { fetch: f });
    expect(seen).toHaveLength(3);
    expect(seen.every((s) => s.url.startsWith("https://cloudflare-dns.com/dns-query?") && s.accept === "application/dns-json")).toBe(true);
  });
  it("a failed query is an error (could not check), never empty records", async () => {
    const f = async () => new Response("", { status: 500 });
    const r = await dnsRecords({ domain: "acme.com" }, { fetch: f, sleep: async () => {} });
    expect(r).toMatchObject({ ok: false, error: { kind: "http" } });
  });
});
