import { describe, expect, it, vi } from "vitest";

import { fetchPage } from "./fetch-page";

describe("fetchPage", () => {
  it("parses HTML title, text, and links", async () => {
    const html = `<!doctype html><html><head><title>Careers</title></head>
      <body><p>We are hiring.</p><a href="/jobs/1">Engineer</a></body></html>`;

    const result = await fetchPage(
      { url: "https://example.com/careers" },
      {
        appUrl: "https://app.test",
        faults: [],
        deps: {
          lookup: async () => [{ address: "93.184.216.34", family: 4 }],
          fetch: async () =>
            new Response(html, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            }),
        },
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Careers");
      expect(result.data.text).toContain("We are hiring");
      expect(result.data.links[0]?.href).toBe("https://example.com/jobs/1");
    }
  });

  it("returns blocked when careers fault is injected", async () => {
    const result = await fetchPage(
      { url: "https://example.com/" },
      {
        faults: [{ tool: "careers", kind: "blocked" }],
        deps: {
          lookup: async () => [{ address: "93.184.216.34", family: 4 }],
          fetch: vi.fn(),
        },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blocked");
    }
  });
});
