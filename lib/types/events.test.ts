import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { StreamEvent, StreamEvents } from "./events";

const dir = join(__dirname, "../../fixtures/streams");
const fixtures = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe("fixture streams", () => {
  it("exist", () => {
    expect(fixtures).toContain("sample-uc1.json");
  });

  describe.each(fixtures)("%s", (file) => {
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const parsed = StreamEvents.safeParse(raw);

    it("parses as StreamEvent[]", () => {
      expect(parsed.error?.issues).toBeUndefined();
    });

    it("is one coherent run: increasing seq and ts, one runId, known callIds", () => {
      const events = parsed.data ?? [];
      const called = new Set<string>();
      events.forEach((e, i) => {
        if (i > 0) {
          expect(e.seq).toBeGreaterThan(events[i - 1]!.seq);
          expect(e.ts >= events[i - 1]!.ts).toBe(true);
        }
        expect(e.runId).toBe(events[0]!.runId);
        if (e.type === "tool_called") called.add(e.callId);
        if (e.type === "tool_result" || e.type === "tool_failed") expect(called).toContain(e.callId);
      });
      expect(events[0]?.type).toBe("run_started");
    });
  });

  it("sample-uc1 covers recovery and a verifier challenge", () => {
    const events = StreamEvents.parse(JSON.parse(readFileSync(join(dir, "sample-uc1.json"), "utf8")));
    const types = new Set(events.map((e) => e.type));
    expect(types).toContain("recovery");
    expect(types).toContain("verifier_challenge");
    expect(events.at(-1)?.type).toBe("run_finished");
  });
});

describe("StreamEvent", () => {
  const base = { seq: 1, ts: "2026-10-10T12:00:00.000Z", runId: "run_1" };

  it("rejects an unknown event type", () => {
    expect(StreamEvent.safeParse({ ...base, type: "telepathy" }).success).toBe(false);
  });

  it("rejects an over-long tool inputSummary", () => {
    const e = { ...base, type: "tool_called", callId: "c1", node: "employer", tool: "webSearch", inputSummary: "x".repeat(121) };
    expect(StreamEvent.safeParse(e).success).toBe(false);
  });
});
