import { describe, expect, it, vi } from "vitest";

import { closeSmokeTelemetry } from "./smoke-lifecycle";

describe("closeSmokeTelemetry", () => {
  it("flushes before shutting down", async () => {
    const calls: string[] = [];

    await closeSmokeTelemetry({
      flush: vi.fn(async () => {
        calls.push("flush");
        return true;
      }),
      shutdown: vi.fn(async () => {
        calls.push("shutdown");
        return true;
      }),
    });

    expect(calls).toEqual(["flush", "shutdown"]);
  });

  it("shuts down even when flushing throws", async () => {
    const shutdown = vi.fn(async () => true);

    await expect(
      closeSmokeTelemetry({
        flush: vi.fn(async () => {
          throw new Error("flush failed");
        }),
        shutdown,
      }),
    ).rejects.toThrow("flush failed");
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it("reports an unsuccessful shutdown", async () => {
    await expect(
      closeSmokeTelemetry({
        flush: vi.fn(async () => true),
        shutdown: vi.fn(async () => false),
      }),
    ).rejects.toThrow("NeatLogs shutdown did not complete successfully.");
  });
});
