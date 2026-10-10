import { afterEach, describe, expect, it, vi } from "vitest";

import { toolErr, withRetry } from "./result";

describe("withRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries once on retryable errors", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockResolvedValueOnce(toolErr("timeout", "slow", true))
      .mockResolvedValueOnce({ ok: true, data: "ok" });

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true, data: "ok" });
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockResolvedValue(toolErr("blocked", "nope", false));
    const result = await withRetry(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
  });
});
