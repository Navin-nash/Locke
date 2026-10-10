import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { atsLookup } from "./lookup";

const fx = (n: string) => readFileSync(new URL(`../__fixtures__/ats/${n}`, import.meta.url), "utf8");
const json = (body: string, status = 200) => async () => new Response(body, { status });
const noSleep = async () => {};

const cases = [
  { provider: "greenhouse", slug: "figma", file: "greenhouse-figma.json", host: "boards-api.greenhouse.io/v1/boards/figma/jobs" },
  { provider: "lever", slug: "palantir", file: "lever-palantir.json", host: "api.lever.co/v0/postings/palantir?mode=json" },
  { provider: "ashby", slug: "ramp", file: "ashby-ramp.json", host: "api.ashbyhq.com/posting-api/job-board/ramp?includeCompensation=true" },
  { provider: "smartrecruiters", slug: "ServiceNow", file: "smartrecruiters-servicenow.json", host: "api.smartrecruiters.com/v1/companies/ServiceNow/postings" },
  { provider: "workable", slug: "huggingface", file: "workable-huggingface.json", host: "apply.workable.com/api/v1/widget/accounts/huggingface" },
] as const;

describe.each(cases)("atsLookup $provider", ({ provider, slug, file, host }) => {
  it("normalizes real postings to the SPEC §7 shape", async () => {
    let called = "";
    const fetch = async (u: string | URL | Request) => {
      called = String(u);
      return new Response(fx(file));
    };
    const r = await atsLookup({ provider, slug }, { fetch, sleep: noSleep });
    expect(called).toContain(host);
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.exists).toBe(true);
    expect(r.data.postings.length).toBe(3);
    for (const p of r.data.postings) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBe(p.title.trim());
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https:\/\//);
    }
  });
});

describe("atsLookup per-provider mapping", () => {
  const first = async (c: (typeof cases)[number]) => {
    const r = await atsLookup({ provider: c.provider, slug: c.slug }, { fetch: json(fx(c.file)), sleep: noSleep });
    if (!r.ok) throw new Error("expected ok");
    return r.data.postings[0]!;
  };
  it("greenhouse: requisition_id becomes reqId, absolute_url becomes url", async () => {
    expect(await first(cases[0])).toMatchObject({
      id: "5426468004",
      reqId: "1451",
      title: "Account Executive, Enterprise",
      location: "San Francisco, CA • New York, NY • United States",
      url: "https://boards.greenhouse.io/figma/jobs/5426468004?gh_jid=5426468004",
    });
  });
  it("lever: workplaceType and commitment map through", async () => {
    expect(await first(cases[1])).toMatchObject({ workplace: "hybrid", employmentType: "Full-time", department: "Administrative" });
  });
  it("ashby: trims title, maps workplace and structured compensation", async () => {
    const p = await first(cases[2]);
    expect(p.title).toBe("Security Engineer, Cloud");
    expect(p.workplace).toBe("hybrid");
    expect(p.compensation).toMatchObject({ min: 211400, max: 290600, currency: "USD" });
  });
  it("smartrecruiters: refNumber becomes reqId, hybrid flag maps to workplace", async () => {
    expect(await first(cases[3])).toMatchObject({ reqId: "JB0073869", workplace: "hybrid", employmentType: "Full-time" });
  });
  it("workable: telecommuting maps to remote; shortcode is the id", async () => {
    expect(await first(cases[4])).toMatchObject({ id: "81B46579FE", workplace: "remote", url: "https://apply.workable.com/j/81B46579FE" });
  });
});

describe("atsLookup existence and failures", () => {
  it.each([["greenhouse"], ["lever"], ["ashby"], ["workable"]] as const)("%s 404 -> ok with exists:false", async (provider) => {
    const r = await atsLookup({ provider, slug: "nope" }, { fetch: json("Not Found", 404), sleep: noSleep });
    expect(r).toMatchObject({ ok: true, data: { exists: false, postings: [] } });
  });
  it("smartrecruiters unknown slug (200, totalFound 0) -> exists:false", async () => {
    const r = await atsLookup({ provider: "smartrecruiters", slug: "nope" }, { fetch: json(fx("smartrecruiters-unknown.json")), sleep: noSleep });
    expect(r).toMatchObject({ ok: true, data: { exists: false, postings: [] } });
  });
  it("workable existing account with no jobs -> exists:true, empty postings", async () => {
    const r = await atsLookup({ provider: "workable", slug: "dataiku" }, { fetch: json(fx("workable-empty.json")), sleep: noSleep });
    expect(r).toMatchObject({ ok: true, data: { exists: true, companyName: "Dataiku", postings: [] } });
  });
  it("a 5xx is an error, never exists:false (missing evidence is not fraud)", async () => {
    const r = await atsLookup({ provider: "greenhouse", slug: "figma" }, { fetch: json("boom", 503), sleep: noSleep });
    expect(r.ok).toBe(false);
  });
  it("malformed JSON is a parse error", async () => {
    const r = await atsLookup({ provider: "lever", slug: "x" }, { fetch: json("<html>"), sleep: noSleep });
    expect(r).toMatchObject({ ok: false, error: { kind: "parse" } });
  });
  it("rejects slugs that could escape the path", async () => {
    const r = await atsLookup({ provider: "lever", slug: "../x" }, { fetch: json("[]"), sleep: noSleep });
    expect(r).toMatchObject({ ok: false, error: { kind: "invalid_input" } });
  });
  it("caps postings at 200", async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ id: i, title: `Role ${i}`, absolute_url: `https://boards.greenhouse.io/x/jobs/${i}`, location: { name: "NYC" } }));
    const r = await atsLookup({ provider: "greenhouse", slug: "x" }, { fetch: json(JSON.stringify({ jobs: many })), sleep: noSleep });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.postings).toHaveLength(200);
  });
});
