import { randomUUID } from "node:crypto";

import { smokeGraph, smokeGraphInput } from "@/lib/agent/smoke-graph";
import { isSmokeEndpointEnabled } from "@/lib/agent/smoke-access";
import { createNeatlogsHandler, flushNeatlogs } from "@/lib/neatlogs";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  if (!isSmokeEndpointEnabled(process.env)) {
    return new Response("Not found", { status: 404 });
  }

  const runId = randomUUID();
  const graphAbort = new AbortController();
  let cancelled = false;
  const abortGraph = () => graphAbort.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortGraph, { once: true });

  const body = await request.json().catch(() => ({}));
  const domain =
    typeof body === "object" &&
    body !== null &&
    "domain" in body &&
    typeof body.domain === "string"
      ? body.domain
      : "example.com";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const handler = await createNeatlogsHandler();
        controller.enqueue(sse("run", { runId }));

        const events = await smokeGraph.stream(smokeGraphInput(domain), {
          configurable: { thread_id: runId },
          streamMode: ["updates", "messages"],
          callbacks: [handler],
          tags: ["variant:smoke"],
          runId,
          signal: graphAbort.signal,
        });

        for await (const event of events) {
          controller.enqueue(sse("graph", event));
        }

        controller.enqueue(sse("done", { runId }));
      } catch (error) {
        if (!graphAbort.signal.aborted) {
          controller.enqueue(
            sse("error", {
              runId,
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          );
        }
      } finally {
        request.signal.removeEventListener("abort", abortGraph);
        await flushNeatlogs().catch(() => false);
        if (!cancelled) {
          controller.close();
        }
      }
    },
    cancel(reason) {
      cancelled = true;
      graphAbort.abort(reason);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
