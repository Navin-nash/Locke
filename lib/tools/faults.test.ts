import { describe, expect, it } from "vitest";

import { parseLockeFaults, shouldInjectFault } from "./faults";

describe("parseLockeFaults", () => {
  it("parses comma-separated tool:kind pairs", () => {
    expect(parseLockeFaults("crustdata:429,careers:blocked,ats:timeout")).toEqual([
      { tool: "crustdata", kind: "429" },
      { tool: "careers", kind: "blocked" },
      { tool: "ats", kind: "timeout" },
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseLockeFaults("")).toEqual([]);
    expect(parseLockeFaults(undefined)).toEqual([]);
  });

  it("matches injected faults", () => {
    const faults = parseLockeFaults("careers:blocked");
    expect(shouldInjectFault(faults, "careers", "blocked")).toBe(true);
    expect(shouldInjectFault(faults, "careers", "timeout")).toBe(false);
  });
});
