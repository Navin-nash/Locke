import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const validEnv = {
  OPENROUTER_API_KEY: "openrouter-key",
  NEATLOGS_API_KEY: "neatlogs-key",
  APP_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("accepts the required server configuration", () => {
    expect(parseServerEnv(validEnv)).toEqual(validEnv);
  });

  it("normalizes empty optional values to undefined", () => {
    expect(
      parseServerEnv({
        ...validEnv,
        DATABASE_URL: "",
        CRUSTDATA_API_KEY: "",
      }),
    ).toEqual({
      ...validEnv,
      DATABASE_URL: undefined,
      CRUSTDATA_API_KEY: undefined,
    });
  });

  it("reports every invalid required field", () => {
    expect(() =>
      parseServerEnv({
        OPENROUTER_API_KEY: "",
        NEATLOGS_API_KEY: "",
        APP_URL: "not-a-url",
      }),
    ).toThrow(
      "Invalid server environment: OPENROUTER_API_KEY: is required; NEATLOGS_API_KEY: is required; APP_URL: must be a valid URL",
    );
  });
});
