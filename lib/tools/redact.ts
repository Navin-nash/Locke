import { z } from "zod";

export const RedactionKind = z.enum([
  "email",
  "phone",
  "ssn",
  "aadhaar",
  "pan",
  "passport",
  "iban",
  "card",
  "account",
  "otp",
]);
export type RedactionKind = z.infer<typeof RedactionKind>;

export const redactPiiInputSchema = z.object({
  text: z.string(),
});

export const redactPiiOutputSchema = z.object({
  text: z.string(),
  redactions: z.array(
    z.object({
      kind: RedactionKind,
      count: z.number().int().nonnegative(),
    }),
  ),
});

export type RedactPiiOutput = z.infer<typeof redactPiiOutputSchema>;

type Counter = Record<RedactionKind, number>;

function emptyCounters(): Counter {
  return {
    email: 0,
    phone: 0,
    ssn: 0,
    aadhaar: 0,
    pan: 0,
    passport: 0,
    iban: 0,
    card: 0,
    account: 0,
    otp: 0,
  };
}

function maskEmailLocal(match: string): string {
  const at = match.indexOf("@");
  if (at <= 0) {
    return match;
  }
  const local = match.slice(0, at);
  const domain = match.slice(at);
  const visible = local.slice(0, 1);
  return `${visible}***${domain}`;
}

const PATTERNS: { kind: RedactionKind; regex: RegExp; replace: (m: string) => string }[] = [
  {
    kind: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replace: maskEmailLocal,
  },
  {
    kind: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
    replace: () => "[REDACTED_IBAN]",
  },
  {
    kind: "card",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    replace: () => "[REDACTED_CARD]",
  },
  {
    kind: "ssn",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replace: () => "[REDACTED_SSN]",
  },
  {
    kind: "aadhaar",
    regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    replace: () => "[REDACTED_AADHAAR]",
  },
  {
    kind: "pan",
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    replace: () => "[REDACTED_PAN]",
  },
  {
    kind: "passport",
    regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
    replace: () => "[REDACTED_PASSPORT]",
  },
  {
    kind: "phone",
    regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g,
    replace: () => "[REDACTED_PHONE]",
  },
  {
    kind: "account",
    regex: /\b(?:account|acct)[#:\s-]*\d{6,17}\b/gi,
    replace: () => "[REDACTED_ACCOUNT]",
  },
  {
    kind: "otp",
    regex: /\b(?:otp|code|pin)[:\s-]*\d{4,8}\b/gi,
    replace: () => "[REDACTED_OTP]",
  },
];

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isLikelyCard(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
}

/** Masks common PII patterns before tracing or storage (SPEC §7). */
export function redactPii(input: { text: string }): RedactPiiOutput {
  const parsed = redactPiiInputSchema.parse(input);
  const counts = emptyCounters();
  let text = parsed.text;

  for (const pattern of PATTERNS) {
    text = text.replace(pattern.regex, (match) => {
      if (pattern.kind === "card" && !isLikelyCard(match)) {
        return match;
      }
      if (pattern.kind === "aadhaar") {
        const digits = match.replace(/\s/g, "");
        if (digits.length !== 12) {
          return match;
        }
      }
      counts[pattern.kind] += 1;
      return pattern.replace(match);
    });
  }

  const redactions = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({
      kind: kind as RedactionKind,
      count,
    }));

  return { text, redactions };
}
