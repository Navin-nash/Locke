import { describe, expect, it } from "vitest";

import { isSmokeEndpointEnabled } from "./smoke-access";

describe("isSmokeEndpointEnabled", () => {
  it.each([
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "test" }, true],
    [{ NODE_ENV: "production" }, false],
    [{}, true],
  ])("evaluates %o as %s", (env, expected) => {
    expect(isSmokeEndpointEnabled(env)).toBe(expected);
  });

  it("allows production only when the configured token matches", () => {
    const env = {
      NODE_ENV: "production",
      LOCKE_SMOKE_TOKEN: "local-secret",
    };

    expect(isSmokeEndpointEnabled(env, "local-secret")).toBe(true);
    expect(isSmokeEndpointEnabled(env, "wrong-secret")).toBe(false);
    expect(isSmokeEndpointEnabled(env)).toBe(false);
  });
});
