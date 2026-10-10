import { describe, expect, it } from "vitest";

import { Dossier, Evidence, Finding, SafeRoute } from "./domain";
import { DIMENSION_STATUSES, Dimension, STATUS_LABELS, STATUS_TONE } from "./status";

const finding = (dimension: string, status: string) => ({
  dimension,
  status,
  summary: "s",
  reason: "r",
  evidenceIds: [],
});

const safeRoute = { status: "not_established", evidenceIds: [], caveat: "c" };

const dossier = (dimensions: unknown[]) => ({
  outcome: "insufficient_evidence",
  reasonCodes: ["R4"],
  outcomeReason: "r",
  headline: "h",
  dimensions,
  safeRoute,
  verified: [],
  notVerified: [],
  concerns: [],
  missingEvidence: [],
  nextSteps: [{ kind: "save_case_link", text: "t" }],
  generatedAt: "2026-10-10T12:00:00.000Z",
});

const uncertain = {
  employer: "insufficient_evidence",
  vacancy: "not_independently_located",
  recruiter: "could_not_verify",
  application_link: "not_provided",
  requests: "none_detected",
  safe_route: "not_established",
} as const;

const allSix = Dimension.options.map((d) => finding(d, uncertain[d]));

describe("Finding", () => {
  it("accepts a status from its own dimension", () => {
    expect(Finding.safeParse(finding("employer", "apparent_impersonation")).success).toBe(true);
  });

  it("rejects a status that belongs to another dimension", () => {
    expect(Finding.safeParse(finding("vacancy", "confirmed")).success).toBe(false);
  });

  it("rejects a verifier `from` status outside the dimension", () => {
    const f = { ...finding("requests", "needs_confirmation"), verifier: { verdict: "downgrade", from: "confirmed", reason: "x" } };
    expect(Finding.safeParse(f).success).toBe(false);
  });
});

describe("Dossier", () => {
  it("accepts exactly one finding per dimension", () => {
    expect(Dossier.safeParse(dossier(allSix)).success).toBe(true);
  });

  it("rejects a missing dimension", () => {
    expect(Dossier.safeParse(dossier(allSix.slice(1))).success).toBe(false);
  });

  it("rejects a duplicated dimension", () => {
    expect(Dossier.safeParse(dossier([...allSix.slice(1), allSix[1]])).success).toBe(false);
  });
});

describe("URL fields", () => {
  it("reject non-http schemes so the UI never renders a javascript: link", () => {
    expect(SafeRoute.safeParse({ ...safeRoute, url: "javascript:alert(1)" }).success).toBe(false);
    expect(
      Evidence.safeParse({
        id: "e1",
        sourceType: "derived",
        tool: "domainSimilarity",
        url: "javascript:alert(1)",
        title: "t",
        excerpt: "x",
        retrievedAt: "2026-10-10T12:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("status vocabulary", () => {
  it("labels and tones every status of every dimension", () => {
    for (const d of Dimension.options) {
      for (const s of DIMENSION_STATUSES[d].options) {
        expect(STATUS_LABELS[s]).toBeTruthy();
        expect(STATUS_TONE[s]).toMatch(/^(positive|neutral|warning)$/);
      }
    }
  });

  it("keeps requests=none_detected neutral, since it only observes recruiter-supplied text", () => {
    expect(STATUS_TONE.none_detected).toBe("neutral");
    expect(STATUS_LABELS.none_detected).toBe("No payment or sensitive-data requests in what you shared");
  });
});
