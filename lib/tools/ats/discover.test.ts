import { describe, expect, it } from "vitest";
import { atsDiscover } from "./discover";
import type { AtsLookupData } from "./types";

const page = (links: string[]) =>
  `<html><body>${links.map((l) => `<a href="${l}">Jobs</a>`).join("")}<script src="https://boards.greenhouse.io/embed/job_board/js?for=acmecorp"></script></body></html>`;
const noSleep = async () => {};

const fetchOf = (pages: Record<string, string>) => async (u: string | URL | Request) => {
  const body = pages[String(u)];
  return body === undefined ? new Response("nf", { status: 404 }) : new Response(body, { headers: { "content-type": "text/html" } });
};
const none = async () => ({ ok: true as const, data: { exists: false, boardUrl: "", postings: [] } satisfies AtsLookupData });

describe("atsDiscover", () => {
  it("finds boards linked from the careers page, including script embeds, marked linkedFromOfficialSite:true", async () => {
    const f = fetchOf({
      "https://acme.com/careers": page(["https://jobs.lever.co/acme", "https://jobs.ashbyhq.com/Acme/abc-123", "https://acme.com/about"]),
    });
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme" }, { fetch: f, sleep: noSleep, lookup: none });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.boards).toEqual(
      expect.arrayContaining([
        { provider: "lever", slug: "acme", linkedFromOfficialSite: true, sourceUrl: "https://acme.com/careers" },
        { provider: "ashby", slug: "Acme", linkedFromOfficialSite: true, sourceUrl: "https://acme.com/careers" },
        { provider: "greenhouse", slug: "acmecorp", linkedFromOfficialSite: true, sourceUrl: "https://acme.com/careers" },
      ]),
    );
  });

  it("honours a supplied careersUrl and reports it", async () => {
    const f = fetchOf({ "https://careers.acme.com/": page(["https://apply.workable.com/acme-inc/"]) });
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme", careersUrl: "https://careers.acme.com/" }, { fetch: f, sleep: noSleep, lookup: none });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.careersUrl).toBe("https://careers.acme.com/");
    expect(r.data.boards.map((b) => `${b.provider}:${b.slug}`)).toContain("workable:acme-inc");
  });

  it("slug guesses that exist are included with linkedFromOfficialSite:false", async () => {
    const lookup = async ({ provider, slug }: { provider: string; slug: string }) => ({
      ok: true as const,
      data: { exists: provider === "greenhouse" && slug === "acme", boardUrl: `https://boards.greenhouse.io/${slug}`, postings: [] },
    });
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme" }, { fetch: fetchOf({}), sleep: noSleep, lookup });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.boards).toEqual([{ provider: "greenhouse", slug: "acme", linkedFromOfficialSite: false, sourceUrl: "https://boards.greenhouse.io/acme" }]);
  });

  it("a guessed board whose postings live on the official domain counts as linked", async () => {
    const lookup = async ({ provider }: { provider: string }) => ({
      ok: true as const,
      data: { exists: provider === "greenhouse", boardUrl: "https://boards.greenhouse.io/acme", postings: [{ id: "1", title: "Eng", url: "https://www.acme.com/careers?gh_jid=1" }] },
    });
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme" }, { fetch: fetchOf({}), sleep: noSleep, lookup });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.boards[0]).toMatchObject({ provider: "greenhouse", linkedFromOfficialSite: true });
  });

  it("a linked board is not duplicated by its own slug guess", async () => {
    const lookup = async () => ({ ok: true as const, data: { exists: true, boardUrl: "https://x", postings: [] } });
    const f = fetchOf({ "https://acme.com/careers": page(["https://jobs.lever.co/acme"]) });
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme" }, { fetch: f, sleep: noSleep, lookup });
    if (!r.ok) throw new Error("expected ok");
    expect(r.data.boards.filter((b) => b.provider === "lever" && b.slug === "acme")).toHaveLength(1);
    expect(r.data.boards.find((b) => b.provider === "lever" && b.slug === "acme")?.linkedFromOfficialSite).toBe(true);
  });

  it("blocked or missing pages yield an empty result, not an error", async () => {
    const r = await atsDiscover({ officialDomain: "acme.com", companyName: "Acme" }, { fetch: fetchOf({}), sleep: noSleep, lookup: none });
    expect(r).toEqual({ ok: true, data: { boards: [] } });
  });
});
