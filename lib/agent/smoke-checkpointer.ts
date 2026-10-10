import { MemorySaver } from "@langchain/langgraph";

export const smokeCheckpointer = new MemorySaver();

export async function clearSmokeGraphThread(threadId: string): Promise<void> {
  await smokeCheckpointer.deleteThread(threadId);
}
