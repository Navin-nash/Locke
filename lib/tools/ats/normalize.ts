import type { Workplace } from "./types";

export const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const rec = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function workplaceOf(v: unknown): Workplace | undefined {
  const s = str(v)?.toLowerCase().replace(/[^a-z]/g, "");
  if (s === "remote") return "remote";
  if (s === "hybrid") return "hybrid";
  if (s === "onsite" || s === "inoffice") return "onsite";
  return undefined; // "unspecified" and anything unknown stay unknown, never guessed
}

/** ponytail: location text only; a "Remote - US" style label is the one signal Greenhouse gives. */
export const remoteFromLocation = (loc?: string): Workplace | undefined => (loc && /\bremote\b/i.test(loc) ? "remote" : undefined);
