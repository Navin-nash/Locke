import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

// ponytail: local copy of the SPEC §4/§8/§15 vocab and eval-case shape. Swap for the
// EvalCase schema from lib/types once T02 lands, and keep the cross-field checks below.
const STATUSES = {
  employer: ["confirmed", "conflicting_identity", "insufficient_evidence", "apparent_impersonation"],
  vacancy: ["officially_confirmed", "partially_matched", "conflicting_information", "not_independently_located"],
  recruiter: [
    "consistent_with_employer",
    "verified_intermediary",
    "could_not_verify",
    "inconsistent_with_practices",
    "apparent_impersonation",
  ],
  application_link: [
    "matches_employer_channel",
    "matches_intermediary_channel",
    "third_party_job_board",
    "does_not_match",
    "lookalike_destination",
    "could_not_check",
    "not_provided",
  ],
  requests: ["none_detected", "needs_confirmation", "suspicious_request_detected"],
  safe_route: ["role_posting_confirmed", "careers_page_only", "not_established"],
} as const;

const Outcome = z.enum(["verified_route", "further_verification", "significant_warning", "insufficient_evidence"]);
const UseCase = z.enum([
  "uc1_impersonation",
  "uc2_staffing_agency",
  "uc3_nonexistent_vacancy",
  "uc4_money_request",
  "uc5_sensitive_documents",
  "uc6_conflicting_terms",
  "control_genuine",
]);
const Host = z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/);

const EvalCase = z
  .object({
    id: z.string().regex(/^(uc[1-6]|ctl)-\d{2}$/),
    useCase: UseCase,
    input: z.object({ text: z.string().min(20).max(20_000), url: z.string().url().optional() }).strict(),
    expected: z
      .object({
        outcome: Outcome,
        dimensions: z
          .object({
            employer: z.enum(STATUSES.employer),
            vacancy: z.enum(STATUSES.vacancy),
            recruiter: z.enum(STATUSES.recruiter),
            application_link: z.enum(STATUSES.application_link),
            requests: z.enum(STATUSES.requests),
            safe_route: z.enum(STATUSES.safe_route),
          })
          .partial()
          .strict(),
        safeRoute: z
          .object({
            status: z.enum(STATUSES.safe_route),
            url: z.string().url().nullable(),
            host: Host.optional(),
          })
          .strict(),
        forbiddenSafeRouteHosts: z.array(Host),
        flags: z.object({ scoreUnsafeLink: z.boolean(), scoreFalseAccusation: z.boolean() }).strict(),
      })
      .strict(),
    source: z
      .object({
        company: z.string(),
        officialDomain: Host,
        board: z.object({ provider: z.enum(["greenhouse", "lever", "ashby"]), slug: z.string() }).nullable(),
        postingId: z.string().nullable(),
        postingUrl: z.string().url().nullable(),
        checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .strict(),
    syntheticDomains: z.array(Host),
    notes: z.string().min(20),
  })
  .strict();
type EvalCase = z.infer<typeof EvalCase>;

// Real, registered domains the cases may mention. Everything else must be a synthetic,
// RDAP-unregistered domain listed in the case's syntheticDomains and in evals/README.md.
const REAL_DOMAINS = new Set([
  "stripe.com", "figma.com", "cloudflare.com", "discord.com", "palantir.com", "notion.com", "linear.app", "ramp.com",
  "randstadusa.com", "roberthalf.com", "teksystems.com", "michaelpage.com",
  "boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com",
  "gmail.com", "outlook.com",
]);

const DIR = join(__dirname, "cases");
const README = readFileSync(join(__dirname, "README.md"), "utf8");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const cases: EvalCase[] = files.map((f) => {
  const parsed = EvalCase.parse(JSON.parse(readFileSync(join(DIR, f), "utf8")));
  expect(`${parsed.id}.json`).toBe(f);
  return parsed;
});
const byUseCase = (u: z.infer<typeof UseCase>) => cases.filter((c) => c.useCase === u);
const suppliedLinks = (c: EvalCase) => [...(c.input.text.match(/https?:\/\/[^\s)]+/g) ?? []), ...(c.input.url ? [c.input.url] : [])];
const mentionedDomains = (c: EvalCase) => {
  const text = `${c.input.text} ${c.input.url ?? ""}`;
  const fromUrls = suppliedLinks(c).map((u) => new URL(u).host.replace(/^www\./, ""));
  const fromEmails = [...text.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)].map((m) => m[1] ?? "");
  return [...fromUrls, ...fromEmails];
};

function r1Triggers(d: EvalCase["expected"]["dimensions"]): boolean {
  return (
    d.employer === "apparent_impersonation" ||
    d.recruiter === "apparent_impersonation" ||
    d.application_link === "lookalike_destination" ||
    d.application_link === "does_not_match" ||
    d.requests === "suspicious_request_detected"
  );
}

describe("eval cases (SPEC §15)", () => {
  it("has 25 cases with unique ids in the §15 distribution", () => {
    expect(cases).toHaveLength(25);
    expect(new Set(cases.map((c) => c.id)).size).toBe(25);
    const counts = Object.fromEntries(UseCase.options.map((u) => [u, byUseCase(u).length]));
    expect(counts).toEqual({
      uc1_impersonation: 5,
      uc2_staffing_agency: 4,
      uc3_nonexistent_vacancy: 4,
      uc4_money_request: 3,
      uc5_sensitive_documents: 3,
      uc6_conflicting_terms: 3,
      control_genuine: 3,
    });
  });

  it("labels each use case with the §15 expected outcomes", () => {
    const uc1 = byUseCase("uc1_impersonation");
    expect(uc1.every((c) => c.expected.outcome === "significant_warning")).toBe(true);
    expect(uc1.filter((c) => c.expected.safeRoute.status === "role_posting_confirmed").length).toBeGreaterThanOrEqual(3);

    for (const c of byUseCase("uc2_staffing_agency")) {
      expect(["further_verification", "verified_route"]).toContain(c.expected.outcome);
    }

    for (const c of byUseCase("uc3_nonexistent_vacancy")) {
      expect(c.expected.dimensions.vacancy).toBe("not_independently_located");
      const hasLink = suppliedLinks(c).length > 0;
      expect(c.expected.outcome).toBe(hasLink ? "significant_warning" : "further_verification");
    }
    expect(byUseCase("uc3_nonexistent_vacancy").filter((c) => suppliedLinks(c).length > 0)).toHaveLength(2);

    for (const c of byUseCase("uc4_money_request")) {
      expect(c.expected.outcome).toBe("significant_warning");
      expect(c.expected.dimensions.requests).toBe("suspicious_request_detected");
    }

    const uc5 = byUseCase("uc5_sensitive_documents");
    expect(uc5.filter((c) => c.expected.outcome === "significant_warning")).toHaveLength(2);
    const uc5Confirm = uc5.filter((c) => c.expected.outcome === "further_verification");
    expect(uc5Confirm).toHaveLength(1);
    expect(uc5Confirm[0]?.expected.dimensions.requests).toBe("needs_confirmation");

    for (const c of byUseCase("uc6_conflicting_terms")) {
      expect(c.expected.outcome).toBe("further_verification");
      expect(c.expected.dimensions.vacancy).toBe("conflicting_information");
    }

    for (const c of byUseCase("control_genuine")) expect(c.expected.outcome).toBe("verified_route");
  });

  it.each(cases.map((c) => [c.id, c] as const))("%s: labels agree with decideOutcome rules (SPEC §5)", (_id, c) => {
    const { outcome, dimensions: d, safeRoute } = c.expected;
    expect(r1Triggers(d)).toBe(outcome === "significant_warning");
    if (outcome === "verified_route") {
      expect(d.vacancy).toBe("officially_confirmed");
      expect(d.safe_route).toBe("role_posting_confirmed");
    }
    if (d.safe_route) expect(d.safe_route).toBe(safeRoute.status);
  });

  it.each(cases.map((c) => [c.id, c] as const))("%s: safe route and scoring flags are consistent", (_id, c) => {
    const { safeRoute, forbiddenSafeRouteHosts, flags, outcome } = c.expected;
    if (safeRoute.status === "role_posting_confirmed") {
      expect(safeRoute.url).not.toBeNull();
      expect(safeRoute.url).toBe(c.source.postingUrl);
      expect(safeRoute.host).toBe(new URL(safeRoute.url ?? "").host);
    } else {
      expect(safeRoute.url).toBeNull();
    }
    if (safeRoute.host) expect(forbiddenSafeRouteHosts).not.toContain(safeRoute.host);
    for (const h of forbiddenSafeRouteHosts) expect(c.syntheticDomains).toContain(h);
    expect(flags.scoreFalseAccusation).toBe(outcome !== "significant_warning");
    expect(flags.scoreUnsafeLink).toBe(forbiddenSafeRouteHosts.length > 0 || suppliedLinks(c).length > 0);
  });

  it.each(cases.map((c) => [c.id, c] as const))("%s: every mentioned domain is real-allowlisted or synthetic and documented", (_id, c) => {
    for (const domain of mentionedDomains(c)) {
      if (REAL_DOMAINS.has(domain)) continue;
      expect(c.syntheticDomains).toContain(domain);
    }
    for (const domain of c.syntheticDomains) {
      expect(REAL_DOMAINS.has(domain)).toBe(false);
      expect(README).toContain(`\`${domain}\``);
    }
    expect(README).toContain(c.source.officialDomain);
    if (c.source.postingId) expect(README).toContain(c.source.postingId);
  });

  it("has 13 cases in the false-accusation denominator (SPEC §15 target ≤ 1/13)", () => {
    expect(cases.filter((c) => c.expected.flags.scoreFalseAccusation)).toHaveLength(13);
  });
});
