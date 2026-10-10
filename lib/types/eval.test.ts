import { describe, expect, it } from "vitest";

import { EvalCase } from "./eval";

const valid = {
  id: "uc1-02",
  useCase: "uc1_impersonation",
  input: { text: "Hello! I'm recruiting for Figma. Apply: https://figma-talent-portal.com/start" },
  expected: {
    outcome: "significant_warning",
    dimensions: { vacancy: "officially_confirmed", application_link: "lookalike_destination" },
    safeRoute: { status: "role_posting_confirmed", url: "https://boards.greenhouse.io/figma/jobs/1", host: "boards.greenhouse.io" },
    forbiddenSafeRouteHosts: ["figma-talent-portal.com"],
    flags: { scoreUnsafeLink: true, scoreFalseAccusation: false },
  },
  source: {
    company: "Figma",
    officialDomain: "figma.com",
    board: { provider: "greenhouse", slug: "figma" },
    postingId: "1",
    postingUrl: "https://boards.greenhouse.io/figma/jobs/1",
    checkedAt: "2026-10-10",
  },
  syntheticDomains: ["figma-talent-portal.com"],
  notes: "Warning comes from the combosquat apply link.",
};

describe("EvalCase", () => {
  it("accepts a labeled case, including a careers_page_only route with a null url", () => {
    expect(EvalCase.safeParse(valid).success).toBe(true);
    const careers = { ...valid, expected: { ...valid.expected, safeRoute: { status: "careers_page_only", url: null } } };
    expect(EvalCase.safeParse(careers).success).toBe(true);
  });

  it("rejects a dimension status from another dimension and unknown use cases", () => {
    const bad = { ...valid, expected: { ...valid.expected, dimensions: { vacancy: "confirmed" } } };
    expect(EvalCase.safeParse(bad).success).toBe(false);
    expect(EvalCase.safeParse({ ...valid, useCase: "uc9" }).success).toBe(false);
  });

  it("rejects unknown keys and a malformed id", () => {
    expect(EvalCase.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(EvalCase.safeParse({ ...valid, id: "case-1" }).success).toBe(false);
  });
});
