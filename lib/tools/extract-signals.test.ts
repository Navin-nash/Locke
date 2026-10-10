import { describe, expect, it } from "vitest";

import { extractSignals } from "./extract-signals";

describe("extractSignals", () => {
  it("extracts urls, emails, and phones", () => {
    const result = extractSignals({
      text: "See https://jobs.example.com/role and email hr@example.com or call +1 (415) 555-0199.",
    });
    expect(result.urls).toEqual(["https://jobs.example.com/role"]);
    expect(result.emails).toEqual(["hr@example.com"]);
    expect(result.phones.length).toBeGreaterThan(0);
  });

  it("detects channel, money, pii, and urgency cues", () => {
    const result = extractSignals({
      text:
        "Message me on WhatsApp. Send a gift card today. Share your bank details ASAP. " +
        "Use recruiter@gmail.com and keep this confidential.",
    });

    expect(result.channels).toContain("whatsapp");
    expect(result.channels).toContain("personal_email");
    expect(result.moneyCues.some((c) => c.kind === "gift_card_or_crypto")).toBe(true);
    expect(result.piiCues.some((c) => c.kind === "bank_details")).toBe(true);
    expect(result.urgencyCues.length).toBeGreaterThan(0);
  });
});
