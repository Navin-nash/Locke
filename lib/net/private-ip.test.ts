import { describe, expect, it } from "vitest";

import { isBlockedIpAddress } from "./private-ip";

describe("isBlockedIpAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
  ])("blocks %s", (address) => {
    expect(isBlockedIpAddress(address)).toBe(true);
  });

  it("allows a public IPv4 address", () => {
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
  });
});
