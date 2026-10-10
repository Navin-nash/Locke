import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const runId = randomUUID();
  const [
    { clearSmokeGraphThread },
    { smokeGraph, smokeGraphInput },
    { closeSmokeTelemetry },
    neatlogs,
  ] = await Promise.all([
    import("../lib/agent/smoke-checkpointer"),
    import("../lib/agent/smoke-graph"),
    import("../lib/agent/smoke-lifecycle"),
    import("../lib/neatlogs"),
  ]);

  try {
    const handler = await neatlogs.createNeatlogsHandler();
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
    try {
      await clearSmokeGraphThread(runId);
    } finally {
      await closeSmokeTelemetry({
        flush: neatlogs.flushNeatlogs,
        shutdown: neatlogs.shutdownNeatlogs,
      });
    }
  }

  console.log(`Locke smoke trace run id: ${runId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
