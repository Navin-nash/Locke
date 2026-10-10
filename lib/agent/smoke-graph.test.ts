import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  clearSmokeGraphThread,
  smokeCheckpointer,
} from "./smoke-checkpointer";

describe("clearSmokeGraphThread", () => {
  it("removes both checkpoints and pending writes for a one-shot run", async () => {
    const threadId = randomUUID();
    const writeKey = JSON.stringify([threadId, "", randomUUID()]);
    smokeCheckpointer.storage[threadId] = {};
    smokeCheckpointer.writes[writeKey] = {};

    await clearSmokeGraphThread(threadId);

    expect(smokeCheckpointer.storage).not.toHaveProperty(threadId);
    expect(smokeCheckpointer.writes).not.toHaveProperty(writeKey);
  });
});
