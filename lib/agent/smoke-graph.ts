import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getWorkerModel } from "@/lib/models";

export const getDomainAge = tool(
  async ({ domain }) =>
    JSON.stringify({
      domain,
      ageDays: 3650,
      source: "fixed-smoke-stub",
    }),
  {
    name: "get_domain_age",
    description: "Return fixed domain-age data for the tracing smoke test.",
    schema: z.object({
      domain: z.string().min(1).describe("Domain name to inspect"),
    }),
  },
);

async function callModel(state: typeof MessagesAnnotation.State) {
  const modelWithTool = getWorkerModel().bindTools([getDomainAge], {
    tool_choice: "get_domain_age",
  });
  const response = await modelWithTool.invoke(state.messages);

  return { messages: [response] };
}

export const smokeGraph = new StateGraph(MessagesAnnotation)
  .addNode("llm", callModel)
  .addNode("tool", new ToolNode([getDomainAge]))
  .addEdge(START, "llm")
  .addEdge("llm", "tool")
  .addEdge("tool", END)
  .compile({ checkpointer: new MemorySaver() });

export function smokeGraphInput(domain = "example.com") {
  return {
    messages: [
      new HumanMessage(
        `Call get_domain_age once for ${domain}. Do not answer without the tool.`,
      ),
    ],
  };
}
