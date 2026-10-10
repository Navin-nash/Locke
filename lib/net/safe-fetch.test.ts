import { describe, expect, it, vi } from "vitest";

import { SAFE_FETCH_MAX_BYTES, safeFetch } from "./safe-fetch";

function mockResponse(
  status: number,
  body: Uint8Array,
  headers: Record<string, string> = {},
): Response {
  return new Response(body as unknown as BodyInit, { status, headers });
}

describe("safeFetch SSRF guard", () => {
  const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

  it("blocks 127.0.0.1", async () => {
    const result = await safeFetch("http://127.0.0.1/", {
      deps: { lookup: publicLookup, fetch: vi.fn() },
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "blocked",
        message: "Target IP is not allowed",
        retryable: false,
      },
    });
  });

  it("blocks 10.x after DNS resolution", async () => {
    const result = await safeFetch("http://internal.example/", {
      deps: {
        lookup: async () => [{ address: "10.0.0.1", family: 4 }],
        fetch: vi.fn(),
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blocked");
    }
  });

  it("blocks 169.254.169.254", async () => {
    const result = await safeFetch("http://169.254.169.254/latest/meta-data", {
      deps: { lookup: publicLookup, fetch: vi.fn() },
    });
    expect(result.ok).toBe(false);
  });

  it("blocks IPv6 loopback", async () => {
    const result = await safeFetch("http://[::1]/", {
      deps: { lookup: publicLookup, fetch: vi.fn() },
    });
    expect(result.ok).toBe(false);
  });

  it("blocks file: URLs", async () => {
    const result = await safeFetch("file:///etc/passwd", {
      deps: { lookup: publicLookup, fetch: vi.fn() },
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "blocked",
        message: "Only http and https URLs are allowed",
        retryable: false,
      },
    });
  });

  it("blocks redirects to a private IP", async () => {
    const fetch = vi.fn(async () =>
      mockResponse(302, new Uint8Array(), {
        Location: "http://127.0.0.1/secret",
      }),
    );

    const result = await safeFetch("http://example.com/", {
      deps: { lookup: publicLookup, fetch },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blocked");
    }
  });

  it("enforces the response size cap", async () => {
    const oversized = new Uint8Array(SAFE_FETCH_MAX_BYTES + 1);
    const fetch = vi.fn(async () => mockResponse(200, oversized));

    const result = await safeFetch("http://example.com/", {
      deps: { lookup: publicLookup, fetch },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "blocked",
        message: "Response exceeds size limit",
        retryable: false,
      },
    });
  });

  it("times out slow responses", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const resultPromise = safeFetch("http://example.com/", {
      timeoutMs: 1000,
      deps: { lookup: publicLookup, fetch },
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("timeout");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("follows a safe redirect chain", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse(301, new Uint8Array(), {
          Location: "https://example.com/final",
        }),
      )
      .mockResolvedValueOnce(mockResponse(200, new TextEncoder().encode("ok")));

    const result = await safeFetch("http://example.com/start", {
      deps: { lookup: publicLookup, fetch },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.finalUrl).toBe("https://example.com/final");
      expect(result.data.redirectChain).toHaveLength(2);
    }
  });
});
