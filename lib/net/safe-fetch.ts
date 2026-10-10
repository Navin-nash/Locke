import { isBlockedIpAddress, isIpLiteralHost } from "./private-ip";

export const SAFE_FETCH_MAX_BYTES = 1_048_576;
export const SAFE_FETCH_MAX_REDIRECTS = 5;
export const SAFE_FETCH_ALLOWED_PORTS = new Set([80, 443]);

export type DnsLookupResult = { address: string; family: number };

export type SafeFetchDeps = {
  fetch: typeof fetch;
  lookup: (hostname: string) => Promise<DnsLookupResult[]>;
};

export type SafeFetchSuccess = {
  finalUrl: string;
  status: number;
  redirectChain: { url: string; status: number }[];
  headers: Headers;
  body: Uint8Array;
};

export type SafeFetchFailure = {
  kind: "blocked" | "invalid_input" | "timeout" | "http";
  message: string;
  retryable: boolean;
};

export type SafeFetchResult =
  | { ok: true; data: SafeFetchSuccess }
  | { ok: false; error: SafeFetchFailure };

function defaultLookup(hostname: string): Promise<DnsLookupResult[]> {
  // Dynamic import keeps vitest able to mock `node:dns/promises`.
  return import("node:dns/promises").then((dns) =>
    dns.lookup(hostname, { all: true, verbatim: true }),
  );
}

export function buildLockeUserAgent(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `LockeBot/0.1 (+${base}/method)`;
}

function parseAllowedUrl(raw: string): URL | SafeFetchFailure {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      kind: "invalid_input",
      message: "URL is not valid",
      retryable: false,
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      kind: "blocked",
      message: "Only http and https URLs are allowed",
      retryable: false,
    };
  }

  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80;

  if (!SAFE_FETCH_ALLOWED_PORTS.has(port)) {
    return {
      kind: "blocked",
      message: "Only ports 80 and 443 are allowed",
      retryable: false,
    };
  }

  if (!url.hostname) {
    return {
      kind: "invalid_input",
      message: "URL hostname is required",
      retryable: false,
    };
  }

  return url;
}

async function assertHostAllowed(
  hostname: string,
  lookup: SafeFetchDeps["lookup"],
): Promise<SafeFetchFailure | undefined> {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    return {
      kind: "blocked",
      message: "Localhost is not allowed",
      retryable: false,
    };
  }

  if (isIpLiteralHost(host)) {
    const literal = host.replace(/^\[/, "").replace(/\]$/, "");
    if (isBlockedIpAddress(literal)) {
      return {
        kind: "blocked",
        message: "Target IP is not allowed",
        retryable: false,
      };
    }
    return undefined;
  }

  const records = await lookup(host);
  for (const record of records) {
    if (isBlockedIpAddress(record.address)) {
      return {
        kind: "blocked",
        message: "Resolved address is not allowed",
        retryable: false,
      };
    }
  }

  return undefined;
}

async function readBodyWithCap(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | SafeFetchFailure> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return {
        kind: "blocked",
        message: "Response exceeds size limit",
        retryable: false,
      };
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
  deps?: Partial<SafeFetchDeps>;
};

export async function safeFetch(
  inputUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const deps: SafeFetchDeps = {
    fetch: options.deps?.fetch ?? globalThis.fetch.bind(globalThis),
    lookup: options.deps?.lookup ?? defaultLookup,
  };

  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? SAFE_FETCH_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? SAFE_FETCH_MAX_REDIRECTS;
  const userAgent = options.userAgent ?? "LockeBot/0.1";

  const parsed = parseAllowedUrl(inputUrl);
  if (!(parsed instanceof URL)) {
    return { ok: false, error: parsed };
  }

  let currentUrl = parsed;
  const redirectChain: { url: string; status: number }[] = [];

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const hostError = await assertHostAllowed(currentUrl.hostname, deps.lookup);
    if (hostError) {
      return { ok: false, error: hostError };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await deps.fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/json,text/plain,*/*",
        },
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: {
            kind: "timeout",
            message: "Request timed out",
            retryable: true,
          },
        };
      }
      return {
        ok: false,
        error: {
          kind: "http",
          message: error instanceof Error ? error.message : "Fetch failed",
          retryable: false,
        },
      };
    } finally {
      clearTimeout(timer);
    }

    redirectChain.push({ url: currentUrl.toString(), status: response.status });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          ok: false,
          error: {
            kind: "http",
            message: "Redirect missing Location header",
            retryable: false,
          },
        };
      }
      if (hop >= maxRedirects) {
        return {
          ok: false,
          error: {
            kind: "blocked",
            message: "Too many redirects",
            retryable: false,
          },
        };
      }
      const next = parseAllowedUrl(new URL(location, currentUrl).toString());
      if (!(next instanceof URL)) {
        return { ok: false, error: next };
      }
      currentUrl = next;
      continue;
    }

    const body = await readBodyWithCap(response, maxBytes);
    if (!(body instanceof Uint8Array)) {
      return { ok: false, error: body };
    }

    return {
      ok: true,
      data: {
        finalUrl: currentUrl.toString(),
        status: response.status,
        redirectChain,
        headers: response.headers,
        body,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: "blocked",
      message: "Too many redirects",
      retryable: false,
    },
  };
}
