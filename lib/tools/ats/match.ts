import type { Compensation, Posting } from "./types";

export type MatchClaim = {
  title: string;
  location?: string;
  workplace?: string;
  employmentType?: string;
  reqId?: string;
  compensation?: string;
};
export type MatchInput = { claim: MatchClaim; postings: Posting[] };
export type Diff = { field: string; claimed: string; official: string; material: boolean };
export type Candidate = { postingId: string; match: "exact" | "strong" | "partial" | "none"; diffs: Diff[] };
export type MatchData = { candidates: Candidate[] };

const MAX_CANDIDATES = 3;
const PARTIAL_MIN = 0.6;
const COMP_GAP = 0.2;
// ponytail: tiny hand-made map; grow it from eval misses, or swap in embeddings if it stops scaling.
const SYNONYMS: Record<string, string[]> = {
  sr: ["senior"], snr: ["senior"], jr: ["junior"], eng: ["engineer"], engineers: ["engineer"],
  swe: ["software", "engineer"], mgr: ["manager"], dev: ["developer"], developers: ["developer"],
};
const STOP = new Set(["a", "an", "the", "of", "and", "for", "in", "at"]);

const words = (s: string): string[] => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);

const titleTokens = (s: string): Set<string> =>
  new Set(words(s).flatMap((w) => SYNONYMS[w] ?? [w]).filter((w) => !STOP.has(w)));

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const empType = (s: string) => {
  const t = s.toLowerCase().replace(/[^a-z]/g, "");
  return t === "permanent" ? "fulltime" : t;
};

/** Mid-point of the first one or two numbers in free text ("$105k-$125k", "120,000"). Undefined when none. */
function midpoint(text: string): number | undefined {
  const nums = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*([kK])?/g)]
    .slice(0, 2)
    .map((m) => Number((m[1] ?? "").replace(/,/g, "")) * (m[2] ? 1000 : 1));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
}

const officialMid = (c: Compensation): number | undefined =>
  c.min !== undefined || c.max !== undefined ? ((c.min ?? c.max ?? 0) + (c.max ?? c.min ?? 0)) / 2 : midpoint(c.summary);

function diffsFor(claim: MatchClaim, p: Posting): Diff[] {
  const out: Diff[] = [];
  if (claim.workplace && p.workplace && !same(claim.workplace, p.workplace)) {
    out.push({ field: "workplace", claimed: claim.workplace, official: p.workplace, material: true });
  }
  if (claim.location && p.location) {
    const official = new Set(words(p.location));
    if (!words(claim.location).some((w) => official.has(w))) {
      out.push({ field: "location", claimed: claim.location, official: p.location, material: true });
    }
  }
  if (claim.employmentType && p.employmentType && empType(claim.employmentType) !== empType(p.employmentType)) {
    out.push({ field: "employmentType", claimed: claim.employmentType, official: p.employmentType, material: true });
  }
  if (claim.compensation && p.compensation) {
    const a = midpoint(claim.compensation);
    const b = officialMid(p.compensation);
    // ponytail: below 1,000 is probably hourly or a non-salary number, so skip rather than flag a false gap.
    if (a !== undefined && b !== undefined && a >= 1000 && b >= 1000 && Math.abs(a - b) / Math.max(a, b) > COMP_GAP) {
      out.push({ field: "compensation", claimed: claim.compensation, official: p.compensation.summary, material: true });
    }
  }
  return out;
}

const RANK = { exact: 3, strong: 2, partial: 1, none: 0 } as const;

/** Pure. Candidates are non-"none" matches only, best first. An empty list means no posting matched. */
export function matchPosting({ claim, postings }: MatchInput): MatchData {
  const claimTokens = titleTokens(claim.title);
  const scored = postings.map((p) => {
    const sim = jaccard(claimTokens, titleTokens(p.title));
    const match: Candidate["match"] =
      claim.reqId && p.reqId && same(claim.reqId, p.reqId) ? "exact" : sim === 1 ? "strong" : sim >= PARTIAL_MIN ? "partial" : "none";
    return { p, sim, match };
  });
  const candidates = scored
    .filter((s) => s.match !== "none")
    .sort((a, b) => RANK[b.match] - RANK[a.match] || b.sim - a.sim)
    .slice(0, MAX_CANDIDATES)
    .map((s) => ({ postingId: s.p.id, match: s.match, diffs: diffsFor(claim, s.p) }));
  return { candidates };
}
