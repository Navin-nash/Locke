import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rdapDomain } from "./rdap";

const fixture = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");
const reply = (status: number, body = "") => async () => new Response(body, { status });
const now = () => new Date("2026-03-01T00:00:00Z");

describe("rdapDomain", () => {
  it("parses registration date, age, and registrar", async () => {
    const r = await rdapDomain({ domain: "www.acme.com" }, { fetch: reply(200, fixture("rdap-example.json")), now });
    expect(r).toEqual({
      ok: true,
      data: { registrableDomain: "acme.com", registered: true, createdAt: "2020-03-01T00:00:00Z", ageDays: 2191, registrar: "Example Registrar, Inc." },
    });
  });
  it("404 means registered:false (ok result)", async () => {
    const r = await rdapDomain({ domain: "acme.com" }, { fetch: reply(404), now });
    expect(r).toEqual({ ok: true, data: { registrableDomain: "acme.com", registered: false } });
  });
  it("429 is retried once, then returns rate_limited", async () => {
    let calls = 0;
    const f = async () => { calls++; return new Response("", { status: 429 }); };
    const r = await rdapDomain({ domain: "acme.com" }, { fetch: f, now, sleep: async () => {} });
    expect(calls).toBe(2);
    expect(r).toMatchObject({ ok: false, error: { kind: "rate_limited", retryable: true } });
  });
  it("a timeout is an error, never a registered:false", async () => {
    const f = async () => { throw new DOMException("t", "TimeoutError"); };
    const r = await rdapDomain({ domain: "acme.com" }, { fetch: f, now, sleep: async () => {} });
    expect(r).toMatchObject({ ok: false, error: { kind: "timeout" } });
  });
  it("rejects invalid input", async () => {
    expect(await rdapDomain({ domain: "nope" }, { fetch: reply(200) })).toMatchObject({ ok: false, error: { kind: "invalid_input" } });
  });
});
