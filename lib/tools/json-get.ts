import { toolErr, type ToolResult } from "./domain-result";

// TODO(T05): replace with the shared retry/backoff helper in lib/tools/result.ts once it lands.
export type GetDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type RawResponse = { status: number; text: string };

const BACKOFF_MS = 500;
const MAX_BODY_CHARS = 100_000;

/** GET with one retry on timeout, 5xx, or 429 (Retry-After honored up to 3 s). Never throws. */
export async function getWithRetry(
  url: string,
  opts: { timeoutMs: number; headers?: Record<string, string> } & GetDeps,
): Promise<ToolResult<RawResponse>> {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: ToolResult<RawResponse> = toolErr("http", "no attempt made", true);
  for (let attempt = 0; attempt < 2; attempt++) {
    let waitMs = BACKOFF_MS;
    try {
      const res = await doFetch(url, { headers: opts.headers, signal: AbortSignal.timeout(opts.timeoutMs) });
      if (res.status === 429) {
        const ra = Number(res.headers.get("retry-after"));
        if (Number.isFinite(ra) && ra > 0) waitMs = Math.min(ra * 1000, 3000);
        last = toolErr("rate_limited", "rate limited (429)", true);
      } else if (res.status >= 500) {
        last = toolErr("http", `upstream error ${res.status}`, true);
      } else {
        return { ok: true, data: { status: res.status, text: (await res.text()).slice(0, MAX_BODY_CHARS) } };
      }
    } catch (e) {
      const timedOut = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
      last = timedOut
        ? toolErr("timeout", `request timed out after ${opts.timeoutMs} ms`, true)
        : toolErr("http", "network error", true);
    }
    if (attempt === 0) await sleep(waitMs);
  }
  return last;
}
