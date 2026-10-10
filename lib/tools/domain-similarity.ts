import { domainToUnicode } from "node:url";
import { parse } from "tldts";
import { z } from "zod";
import { toolErr, toolOk, type ToolResult } from "./domain-result";
import { FREE_WEBMAIL, KNOWN_ATS_HOSTS, KNOWN_JOB_BOARDS, SHORTENERS } from "./lists";

export const DomainSimilarityInput = z.object({
  candidate: z.string().min(1).max(2048),
  officialDomains: z.array(z.string()).max(20),
  brand: z.string().max(200),
});
export type DomainSimilarityInput = z.infer<typeof DomainSimilarityInput>;

export type DomainRelation =
  | "same"
  | "subdomain_of_official"
  | "linked_ats_board"
  | "known_ats"
  | "known_job_board"
  | "free_webmail"
  | "shortener"
  | "lookalike"
  | "brand_in_unrelated_domain"
  | "unrelated";

export type DomainSimilarityData = { relation: DomainRelation; signals: string[] };

const COMBO_KEYWORDS = ["careers", "career", "hr", "jobs", "job", "recruit", "recruitment", "hiring", "talent", "apply"];
const MIN_LABEL_FOR_TYPO = 4;

// ponytail: small hand-picked confusables map (Cyrillic/Greek look-alikes + digits); upgrade to
// the Unicode confusables table if evals show misses.
const CONFUSABLES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j",
  "ѕ": "s", "һ": "h", "ԁ": "d", "ɡ": "g", "ο": "o", "α": "a", "ν": "v", "ρ": "p",
  "0": "o", "1": "l",
};

function foldConfusables(label: string): string {
  const mapped = [...label].map((c) => CONFUSABLES[c] ?? c).join("");
  return mapped.replace(/rn/g, "m").replace(/vv/g, "w");
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diag + cost);
      diag = tmp;
    }
  }
  return prev[b.length] ?? 0;
}

type Parsed = { host: string; registrable: string; label: string; path: string };

function parseCandidate(raw: string): Parsed | null {
  const trimmed = raw.trim();
  if (/\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const p = parse(url.hostname);
  if (!p.domain || !p.hostname) return null;
  const registrable = p.domain;
  const label = domainToUnicode(registrable).split(".")[0] ?? "";
  return { host: p.hostname, registrable, label, path: url.pathname };
}

const hostMatches = (host: string, list: readonly string[]) =>
  list.some((h) => host === h || host.endsWith(`.${h}`));

function officialInfo(officialDomains: string[]) {
  return officialDomains
    .map((d) => parse(d.trim().toLowerCase()))
    .filter((p) => p.domain)
    .map((p) => ({ registrable: p.domain as string, label: (p.domain as string).split(".")[0] ?? "" }));
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classify(c: Parsed, input: DomainSimilarityInput): DomainSimilarityData {
  const officials = officialInfo(input.officialDomains);
  const signals: string[] = [];

  if (hostMatches(c.host, SHORTENERS)) return { relation: "shortener", signals: ["url_shortener"] };
  if (hostMatches(c.host, FREE_WEBMAIL)) return { relation: "free_webmail", signals: ["free_webmail_provider"] };

  for (const o of officials) {
    if (c.host === o.registrable || c.host === `www.${o.registrable}`) return { relation: "same", signals: [] };
    if (c.host.endsWith(`.${o.registrable}`)) return { relation: "subdomain_of_official", signals: [] };
  }

  if (hostMatches(c.host, KNOWN_ATS_HOSTS)) return { relation: "known_ats", signals: ["known_ats_host"] };
  if (hostMatches(c.host, KNOWN_JOB_BOARDS)) return { relation: "known_job_board", signals: ["known_job_board_host"] };

  const rawLabel = c.label.toLowerCase();
  const folded = foldConfusables(rawLabel);
  const isIdn = c.registrable.includes("xn--") || /[^\x00-\x7f]/.test(rawLabel);
  const brandKeys = new Set<string>(officials.map((o) => o.label));
  const brandCompact = compact(input.brand);
  if (brandCompact.length >= 3) brandKeys.add(brandCompact);
  const firstWord = compact(input.brand.split(/\s+/)[0] ?? "");
  if (firstWord.length >= 3) brandKeys.add(firstWord);

  for (const key of brandKeys) {
    const foldedKey = foldConfusables(key);
    if (isIdn && folded === foldedKey) {
      return { relation: "lookalike", signals: ["homoglyph", "punycode_idn"] };
    }
    if (rawLabel !== key && folded === foldedKey) {
      return { relation: "lookalike", signals: ["homoglyph_substitution"] };
    }
    if (key.length >= MIN_LABEL_FOR_TYPO && rawLabel !== key && editDistance(rawLabel, key) <= 2) {
      return { relation: "lookalike", signals: ["edit_distance_le_2"] };
    }
    if (rawLabel === key) {
      return { relation: "lookalike", signals: ["same_label_different_tld"] };
    }
  }

  const parts = rawLabel.split("-").filter(Boolean);
  for (const key of brandKeys) {
    if (!rawLabel.includes(key)) continue;
    const rest = rawLabel.replace(key, "").split("-").filter(Boolean);
    if (rest.length > 0 && rest.every((r) => COMBO_KEYWORDS.includes(r)) && parts.length > 1) {
      return { relation: "lookalike", signals: ["combosquat"] };
    }
    signals.push("brand_in_domain");
    return { relation: "brand_in_unrelated_domain", signals };
  }
  return { relation: "unrelated", signals: [] };
}

export function domainSimilarity(input: DomainSimilarityInput): ToolResult<DomainSimilarityData> {
  const parsedInput = DomainSimilarityInput.safeParse(input);
  if (!parsedInput.success) return toolErr("invalid_input", parsedInput.error.message, false);
  const c = parseCandidate(parsedInput.data.candidate);
  if (!c) return toolErr("invalid_input", "candidate is not a valid domain or URL", false);
  return toolOk(classify(c, parsedInput.data));
}
