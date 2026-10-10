import { flush, init } from "neatlogs";
import { langchainHandler } from "neatlogs/langchain";

import { getServerEnv } from "@/lib/env";

let initializationPromise: Promise<void> | undefined;

export function initializeNeatlogs(): Promise<void> {
  initializationPromise ??= init({
    apiKey: getServerEnv().NEATLOGS_API_KEY,
    workflowName: "locke-agent",
    tags: ["neathack-2026"],
  });

  return initializationPromise;
}

export async function createNeatlogsHandler() {
  await initializeNeatlogs();
  return langchainHandler();
}

export async function flushNeatlogs(): Promise<boolean> {
  await initializeNeatlogs();
  return flush();
}
