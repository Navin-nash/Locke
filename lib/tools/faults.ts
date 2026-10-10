import { z } from "zod";

const faultEntrySchema = z.object({
  tool: z.string().min(1),
  kind: z.string().min(1),
});

export type FaultEntry = z.infer<typeof faultEntrySchema>;

/**
 * Parses `LOCKE_FAULTS` (e.g. `crustdata:429,careers:blocked,ats:timeout`).
 * Non-production fault injection for recovery demos and evals.
 */
export function parseLockeFaults(raw: string | undefined): FaultEntry[] {
  if (!raw?.trim()) {
    return [];
  }

  const entries: FaultEntry[] = [];
  for (const segment of raw.split(",")) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon <= 0 || colon === trimmed.length - 1) {
      continue;
    }
    const tool = trimmed.slice(0, colon).trim();
    const kind = trimmed.slice(colon + 1).trim();
    const parsed = faultEntrySchema.safeParse({ tool, kind });
    if (parsed.success) {
      entries.push(parsed.data);
    }
  }
  return entries;
}

export function shouldInjectFault(
  faults: FaultEntry[],
  tool: string,
  kind: string,
): boolean {
  return faults.some((f) => f.tool === tool && f.kind === kind);
}

export function readLockeFaultsFromEnv(
  env: Record<string, string | undefined> = process.env,
): FaultEntry[] {
  return parseLockeFaults(env.LOCKE_FAULTS);
}
