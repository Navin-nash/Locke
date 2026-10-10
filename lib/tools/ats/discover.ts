import { parse } from "tldts";
import { z } from "zod";
import { toolErr, toolOk, type ToolResult } from "../domain-result";
import { getWithRetry, type GetDeps } from "../json-get";
import { atsLookup } from "./lookup";
import type { AtsLookupData, AtsProvider } from "./types";

export const AtsDiscoverInput = z.object({
  officialDomain: z.string().min(1).max(253),
  companyName: z.string().min(1).max(200),
  careersUrl: z.string().url().optional(),
});

export type DiscoveredBoard = { provider: AtsProvider; slug: string; linkedFromOfficialSite: boolean; sourceUrl: string };
export type AtsDiscoverData = { boards: DiscoveredBoard[]; careersUrl?: string };
type Lookup = (i: { provider: AtsProvider; slug: string }, d?: GetDeps) => Promise<ToolResult<AtsLookupData>>;

// Host patterns SPEC §7 lists; the slug is the first path segment (or `for=` on the Greenhouse embed).
const BOARD_PATTERNS: { provider: AtsProvider; re: RegExp }[] = [
  { provider: "greenhouse", re: /(?:job-)?boards\.greenhouse\.io\/embed\/job_board(?:\/js)?\?for=([\w.-]+)/gi },
  { provider: "greenhouse", re: /(?:job-)?boards\.greenhouse\.io\/(?!embed\b)([\w.-]+)/gi },
  { provider: "lever", re: /jobs\.lever\.co\/([\w.-]+)/gi },
  { provider: "ashby", re: /jobs\.ashbyhq\.com\/([\w.%-]+)/gi },
  { provider: "smartrecruiters", re: /(?:careers|jobs)\.smartrecruiters\.com\/([\w.-]+)/gi },
  { provider: "workable", re: /apply\.workable\.com\/(?!api\b|j\b)([\w.-]+)/gi },
];
const PROVIDERS: AtsProvider[] = ["greenhouse", "lever", "ashby", "smartrecruiters", "workable"];
const PAGE_TIMEOUT_MS = 4000;
const key = (provider: string, slug: string) => `${provider}:${slug.toLowerCase()}`;

function boardsIn(html: string, sourceUrl: string): DiscoveredBoard[] {
  return BOARD_PATTERNS.flatMap(({ provider, re }) =>
    [...html.matchAll(re)].map((m) => ({ provider, slug: decodeURIComponent(m[1] ?? ""), linkedFromOfficialSite: true, sourceUrl })),
  ).filter((b) => b.slug);
}

/** Candidate slugs: the name squashed, hyphenated, and the domain label. At most 3. */
function slugGuesses(companyName: string, domain: string): string[] {
  const words = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const label = parse(domain).domainWithoutSuffix ?? "";
  return [...new Set([words.join(""), words.join("-"), label].filter((s) => /^[a-z0-9][a-z0-9-]{0,99}$/.test(s)))];
}

const onOfficialDomain = (url: string, official: string | null) => official !== null && parse(url).domain === official;

/**
 * ponytail: the 15 s budget is per-stage (pages in parallel, then guesses in parallel), not enforced as one deadline.
 * TODO(T05): route page fetches through lib/net/safe-fetch.ts (SSRF guard) once it lands on main.
 */
export async function atsDiscover(
  input: z.infer<typeof AtsDiscoverInput>,
  deps: GetDeps & { lookup?: Lookup } = {},
): Promise<ToolResult<AtsDiscoverData>> {
  const parsed = AtsDiscoverInput.safeParse(input);
  const official = parsed.success ? parse(parsed.data.officialDomain.trim().toLowerCase()).domain : null;
  if (!parsed.success || !official) return toolErr("invalid_input", "officialDomain or companyName is not valid", false);
  const { companyName, careersUrl } = parsed.data;
  const { lookup = atsLookup, ...getDeps } = deps;

  const pages = [careersUrl, `https://${official}/careers`, `https://${official}/jobs`, `https://${official}/`].filter((u): u is string => !!u);
  const fetched = await Promise.all(
    [...new Set(pages)].map(async (url) => {
      const r = await getWithRetry(url, { timeoutMs: PAGE_TIMEOUT_MS, ...getDeps });
      return r.ok && r.data.status === 200 ? boardsIn(r.data.text, url) : [];
    }),
  );
  const boards = new Map<string, DiscoveredBoard>();
  for (const b of fetched.flat()) if (!boards.has(key(b.provider, b.slug))) boards.set(key(b.provider, b.slug), b);

  const guesses = slugGuesses(companyName, official).flatMap((slug) => PROVIDERS.map((provider) => ({ provider, slug })));
  const found = await Promise.all(
    guesses
      .filter((g) => !boards.has(key(g.provider, g.slug)))
      .map(async (g) => ({ g, r: await lookup(g, getDeps) })),
  );
  for (const { g, r } of found) {
    if (!r.ok || !r.data.exists || boards.has(key(g.provider, g.slug))) continue;
    // Linked only if the board's own postings point at the official domain.
    const linked = r.data.postings.some((p) => onOfficialDomain(p.url, official));
    boards.set(key(g.provider, g.slug), { ...g, linkedFromOfficialSite: linked, sourceUrl: r.data.boardUrl });
  }

  return toolOk({ boards: [...boards.values()], ...(careersUrl ? { careersUrl } : {}) });
}
