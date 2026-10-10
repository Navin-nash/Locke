import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const runId = randomUUID();
  const [{ smokeGraph, smokeGraphInput }, neatlogs] = await Promise.all([
    import("../lib/agent/smoke-graph"),
    import("../lib/neatlogs"),
  ]);
  const handler = await neatlogs.createNeatlogsHandler();

  try {
    const events = await smokeGraph.stream(smokeGraphInput(), {
      configurable: { thread_id: runId },
      streamMode: ["updates", "messages"],
      callbacks: [handler],
      tags: ["variant:smoke"],
      runId,
    });

    for await (const event of events) {
      // Fully consume the stream so every callback span can close before flush.
      void event;
    }
  } finally {
    const flushed = await neatlogs.flushNeatlogs();
    if (!flushed) {
      throw new Error("NeatLogs flush did not complete successfully.");
    }
  }

  console.log(`Locke smoke trace run id: ${runId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
