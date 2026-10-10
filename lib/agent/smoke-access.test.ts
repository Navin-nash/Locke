import { describe, expect, it } from "vitest";

import { isSmokeEndpointEnabled } from "./smoke-access";

describe("isSmokeEndpointEnabled", () => {
  it.each([
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "test" }, true],
    [{ NODE_ENV: "production" }, false],
    [{}, false],
    [{ NODE_ENV: "production", CI: "true" }, true],
    [{ NODE_ENV: "production", CI: "TRUE" }, true],
  ])("evaluates %o as %s", (env, expected) => {
    expect(isSmokeEndpointEnabled(env)).toBe(expected);
  });
});
