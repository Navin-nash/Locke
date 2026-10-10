import { z } from "zod";

export const ToolErrorKind = z.enum([
  "timeout",
  "http",
  "rate_limited",
  "blocked",
  "not_found",
  "invalid_input",
  "parse",
]);
export type ToolErrorKind = z.infer<typeof ToolErrorKind>;

export type ToolError = {
  kind: ToolErrorKind;
  message: string;
  retryable: boolean;
};

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ToolError };

export function toolOk<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function toolErr<T>(
  kind: ToolErrorKind,
  message: string,
  retryable: boolean,
): ToolResult<T> {
  return { ok: false, error: { kind, message, retryable } };
}

const RETRYABLE_KINDS: ToolErrorKind[] = ["timeout", "http", "rate_limited"];

function isRetryableError(error: ToolError): boolean {
  return error.retryable && RETRYABLE_KINDS.includes(error.kind);
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 3000);
  }
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(0, dateMs - Date.now()), 3000);
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type RetryContext = {
  response?: Response;
};

/**
 * Runs `fn` once; on retryable timeout/http/rate_limited errors, waits (500 ms default,
 * or Retry-After up to 3 s) and runs once more.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<ToolResult<T>>,
  getContext?: (result: ToolResult<T>) => RetryContext | undefined,
): Promise<ToolResult<T>> {
  const first = await fn(0);
  if (first.ok || !isRetryableError(first.error)) {
    return first;
  }

  const ctx = getContext?.(first);
  const retryAfter = parseRetryAfterMs(ctx?.response?.headers.get("Retry-After") ?? null);
  await sleep(retryAfter ?? 500);

  const second = await fn(1);
  return second;
}
