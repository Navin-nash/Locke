import { describe, expect, it } from "vitest";
import { matchPosting } from "./match";
import type { Posting } from "./types";

const post = (o: Partial<Posting> & { id: string; title: string }): Posting => ({ url: `https://x.test/${o.id}`, ...o });

describe("matchPosting", () => {
  it("equal reqId is exact, even when the title differs", () => {
    const r = matchPosting({
      claim: { title: "Platform Wizard", reqId: "JR-1451" },
      postings: [post({ id: "a", title: "Account Executive", reqId: "jr-1451 " }), post({ id: "b", title: "Platform Wizard" })],
    });
    expect(r.candidates[0]).toMatchObject({ postingId: "a", match: "exact" });
  });

  it('"Sr. Software Engineer" vs "Senior Software Engineer" is a strong match', () => {
    const r = matchPosting({ claim: { title: "Sr. Software Engineer" }, postings: [post({ id: "a", title: "Senior Software Engineer" })] });
    expect(r.candidates).toEqual([{ postingId: "a", match: "strong", diffs: [] }]);
  });

  it("a dropped seniority word is only a partial match", () => {
    const r = matchPosting({ claim: { title: "Software Engineer" }, postings: [post({ id: "a", title: "Senior Software Engineer" })] });
    expect(r.candidates[0]).toMatchObject({ postingId: "a", match: "partial" });
  });

  it("flags a remote vs onsite difference as material", () => {
    const r = matchPosting({
      claim: { title: "Product Designer", workplace: "remote" },
      postings: [post({ id: "a", title: "Product Designer", workplace: "onsite" })],
    });
    expect(r.candidates[0]?.diffs).toContainEqual({ field: "workplace", claimed: "remote", official: "onsite", material: true });
  });

  it("flags a different country as a material location diff, but not a same-city rewording", () => {
    const base = { title: "Data Engineer" };
    const diff = matchPosting({ claim: { ...base, location: "Berlin, Germany" }, postings: [post({ id: "a", title: "Data Engineer", location: "Austin, United States" })] });
    expect(diff.candidates[0]?.diffs.map((d) => d.field)).toContain("location");
    const same = matchPosting({ claim: { ...base, location: "New York" }, postings: [post({ id: "a", title: "Data Engineer", location: "New York, NY (HQ)" })] });
    expect(same.candidates[0]?.diffs).toEqual([]);
  });

  it("flags employment type differences", () => {
    const r = matchPosting({
      claim: { title: "Data Engineer", employmentType: "Contract" },
      postings: [post({ id: "a", title: "Data Engineer", employmentType: "FullTime" })],
    });
    expect(r.candidates[0]?.diffs).toContainEqual(expect.objectContaining({ field: "employmentType", material: true }));
  });

  it("flags compensation more than 20% apart, tolerates less", () => {
    const comp = { min: 100000, max: 120000, currency: "USD", summary: "$100K - $120K" };
    const mk = (c: string) => matchPosting({ claim: { title: "Data Engineer", compensation: c }, postings: [post({ id: "a", title: "Data Engineer", compensation: comp })] });
    expect(mk("$180,000 - $200,000").candidates[0]?.diffs.map((d) => d.field)).toContain("compensation");
    expect(mk("$105k-$125k").candidates[0]?.diffs).toEqual([]);
  });

  it("returns no candidates when nothing matches", () => {
    const r = matchPosting({ claim: { title: "Quantum Barista" }, postings: [post({ id: "a", title: "Account Executive" }), post({ id: "b", title: "Security Engineer" })] });
    expect(r.candidates).toEqual([]);
  });

  it("returns at most 3 candidates, best first", () => {
    const postings = ["Senior Software Engineer", "Software Engineer", "Software Engineer Intern", "Software Engineer II", "Senior Software Engineer"].map((title, i) => post({ id: String(i), title }));
    const r = matchPosting({ claim: { title: "Sr Software Engineer" }, postings });
    expect(r.candidates).toHaveLength(3);
    expect(r.candidates[0]?.match).toBe("strong");
  });
});
