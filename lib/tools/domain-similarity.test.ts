import { describe, expect, it } from "vitest";
import { domainSimilarity } from "./domain-similarity";

const official = ["acme.com"];
const rel = (candidate: string, brand = "Acme") => {
  const r = domainSimilarity({ candidate, officialDomains: official, brand });
  if (!r.ok) throw new Error(r.error.message);
  return r.data;
};

describe("domainSimilarity", () => {
  it("same domain (url, www, bare)", () => {
    expect(rel("acme.com").relation).toBe("same");
    expect(rel("https://www.acme.com/careers").relation).toBe("same");
  });
  it("subdomain of official", () => {
    expect(rel("careers.acme.com").relation).toBe("subdomain_of_official");
  });
  it("typo acrne.com is a lookalike", () => {
    const d = rel("acrne.com");
    expect(d.relation).toBe("lookalike");
    expect(d.signals.length).toBeGreaterThan(0);
  });
  it("edit distance 1 is a lookalike", () => {
    expect(rel("acmee.com").relation).toBe("lookalike");
  });
  it("Cyrillic homoglyph is a lookalike", () => {
    expect(rel("аcme.com").relation).toBe("lookalike"); // first char is U+0430
  });
  it("punycode form of a homoglyph is a lookalike", () => {
    expect(rel("xn--cme-8cd.com").relation).toBe("lookalike");
  });
  it("combosquat acme-careers.net is a lookalike", () => {
    const d = rel("acme-careers.net");
    expect(d.relation).toBe("lookalike");
    expect(d.signals).toContain("combosquat");
  });
  it("brand inside an unrelated domain", () => {
    expect(rel("best-acme-portal.com").relation).toBe("brand_in_unrelated_domain");
  });
  it("known ATS host", () => {
    expect(rel("https://job-boards.greenhouse.io/acme").relation).toBe("known_ats");
  });
  it("known job board path linkedin.com/jobs", () => {
    expect(rel("https://linkedin.com/jobs/view/123").relation).toBe("known_job_board");
  });
  it("free webmail", () => {
    expect(rel("gmail.com").relation).toBe("free_webmail");
  });
  it("shortener", () => {
    expect(rel("https://bit.ly/3xyz").relation).toBe("shortener");
  });
  it("unrelated domain", () => {
    expect(rel("example.org").relation).toBe("unrelated");
  });
  it("short labels do not trip the typo rule", () => {
    expect(domainSimilarity({ candidate: "abc.com", officialDomains: ["xyz.com"], brand: "Xyz" }))
      .toMatchObject({ ok: true, data: { relation: "unrelated" } });
  });
  it("invalid input returns the shared error shape", () => {
    const r = domainSimilarity({ candidate: "not a domain", officialDomains: official, brand: "Acme" });
    expect(r).toMatchObject({ ok: false, error: { kind: "invalid_input" } });
  });
});
