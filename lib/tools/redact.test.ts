import { describe, expect, it } from "vitest";

import { redactPii } from "./redact";

describe("redactPii", () => {
  it("masks email local parts while keeping the domain", () => {
    const result = redactPii({ text: "Contact jane.doe@acme.com today." });
    expect(result.text).toContain("j***@acme.com");
    expect(result.redactions).toContainEqual({ kind: "email", count: 1 });
  });

  it("masks phones, SSN, Aadhaar, PAN, IBAN, and card numbers", () => {
    const text = [
      "Phone 415-555-0101",
      "SSN 123-45-6789",
      "Aadhaar 2345 6789 0123",
      "PAN ABCDE1234F",
      "IBAN GB82WEST12345698765432",
      "Card 4111 1111 1111 1111",
    ].join("\n");

    const result = redactPii({ text });
    expect(result.text).not.toContain("123-45-6789");
    expect(result.text).not.toContain("2345 6789 0123");
    expect(result.text).not.toContain("ABCDE1234F");
    expect(result.text).not.toContain("GB82WEST12345698765432");
    expect(result.text).not.toContain("4111 1111 1111 1111");
    expect(result.redactions.length).toBeGreaterThan(0);
  });
});
