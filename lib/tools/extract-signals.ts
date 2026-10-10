import { z } from "zod";

export const SignalChannel = z.enum([
  "whatsapp",
  "telegram",
  "signal",
  "sms",
  "personal_email",
]);
export type SignalChannel = z.infer<typeof SignalChannel>;

export const MoneyCueKind = z.enum([
  "payment",
  "equipment_purchase",
  "gift_card_or_crypto",
  "check_deposit",
]);
export type MoneyCueKind = z.infer<typeof MoneyCueKind>;

export const PiiCueKind = z.enum([
  "id_document",
  "bank_details",
  "tax_id",
  "credentials",
]);
export type PiiCueKind = z.infer<typeof PiiCueKind>;

export const extractSignalsInputSchema = z.object({
  text: z.string().max(20_000),
});

export const extractSignalsOutputSchema = z.object({
  urls: z.array(z.string()),
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  channels: z.array(SignalChannel),
  moneyCues: z.array(
    z.object({
      phrase: z.string(),
      kind: MoneyCueKind,
    }),
  ),
  piiCues: z.array(
    z.object({
      phrase: z.string(),
      kind: PiiCueKind,
    }),
  ),
  urgencyCues: z.array(z.string()),
});

export type ExtractSignalsOutput = z.infer<typeof extractSignalsOutputSchema>;

const FREE_WEBMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "mail.com",
]);

const MONEY_LEXICON: { pattern: RegExp; kind: MoneyCueKind }[] = [
  { pattern: /\b(?:pay|send|wire|transfer)\s+(?:a\s+)?fee\b/gi, kind: "payment" },
  { pattern: /\bprocessing fee\b/gi, kind: "payment" },
  { pattern: /\b(?:upfront|advance)\s+payment\b/gi, kind: "payment" },
  { pattern: /\bequipment\s+(?:purchase|fee|deposit)\b/gi, kind: "equipment_purchase" },
  { pattern: /\blaptop\s+(?:purchase|deposit)\b/gi, kind: "equipment_purchase" },
  { pattern: /\bgift\s+card\b/gi, kind: "gift_card_or_crypto" },
  { pattern: /\b(?:bitcoin|crypto|usdt|ethereum)\b/gi, kind: "gift_card_or_crypto" },
  { pattern: /\bcheck\s+deposit\b/gi, kind: "check_deposit" },
  { pattern: /\bmobile\s+deposit\b/gi, kind: "check_deposit" },
];

const PII_LEXICON: { pattern: RegExp; kind: PiiCueKind }[] = [
  { pattern: /\b(?:passport|driver'?s?\s+license|national\s+id)\b/gi, kind: "id_document" },
  { pattern: /\b(?:ssn|social\s+security)\b/gi, kind: "tax_id" },
  { pattern: /\b(?:bank\s+details|routing\s+number|account\s+number|iban)\b/gi, kind: "bank_details" },
  { pattern: /\b(?:login|password|credentials|otp|one[- ]time\s+code)\b/gi, kind: "credentials" },
];

const URGENCY_LEXICON: RegExp[] = [
  /\burgent(?:ly)?\b/gi,
  /\basap\b/gi,
  /\bimmediately\b/gi,
  /\bwithin\s+24\s+hours\b/gi,
  /\bact\s+now\b/gi,
  /\blimited\s+time\b/gi,
  /\bdon'?t\s+tell\b/gi,
  /\bkeep\s+this\s+(?:confidential|between\s+us)\b/gi,
  /\btime[- ]sensitive\b/gi,
];

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/gi;
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function collectMatches(text: string, regex: RegExp): string[] {
  const matches: string[] = [];
  const re = new RegExp(regex.source, regex.flags);
  let m = re.exec(text);
  while (m) {
    matches.push(m[0]);
    m = re.exec(text);
  }
  return matches;
}

function detectChannels(text: string, emails: string[]): SignalChannel[] {
  const channels: SignalChannel[] = [];
  const lower = text.toLowerCase();

  if (/\bwhatsapp\b/.test(lower) || /\bwa\.me\b/.test(lower)) {
    channels.push("whatsapp");
  }
  if (/\btelegram\b/.test(lower) || /\bt\.me\b/.test(lower)) {
    channels.push("telegram");
  }
  if (/\bsignal\b/.test(lower)) {
    channels.push("signal");
  }
  if (/\bsms\b/.test(lower) || /\btext\s+message\b/.test(lower)) {
    channels.push("sms");
  }

  for (const email of emails) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && FREE_WEBMAIL_DOMAINS.has(domain)) {
      channels.push("personal_email");
      break;
    }
  }

  return uniqueStrings(channels) as SignalChannel[];
}

function collectLexicon<T extends string>(
  text: string,
  lexicon: { pattern: RegExp; kind: T }[],
): { phrase: string; kind: T }[] {
  const out: { phrase: string; kind: T }[] = [];
  for (const entry of lexicon) {
    const re = new RegExp(entry.pattern.source, entry.pattern.flags);
    let m = re.exec(text);
    while (m) {
      out.push({ phrase: m[0], kind: entry.kind });
      m = re.exec(text);
    }
  }
  return out;
}

/** Regex and lexicon extraction for intake and the requests investigator (SPEC §7). */
export function extractSignals(input: { text: string }): ExtractSignalsOutput {
  const { text } = extractSignalsInputSchema.parse(input);

  const urls = uniqueStrings(collectMatches(text, URL_REGEX));
  const emails = uniqueStrings(collectMatches(text, EMAIL_REGEX));
  const phones = uniqueStrings(collectMatches(text, PHONE_REGEX));
  const channels = detectChannels(text, emails);
  const moneyCues = collectLexicon(text, MONEY_LEXICON);
  const piiCues = collectLexicon(text, PII_LEXICON);
  const urgencyCues = uniqueStrings(
    URGENCY_LEXICON.flatMap((pattern) => collectMatches(text, pattern)),
  );

  return {
    urls,
    emails,
    phones,
    channels,
    moneyCues,
    piiCues,
    urgencyCues,
  };
}
