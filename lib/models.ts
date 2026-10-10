import { ChatOpenAI } from "@langchain/openai";

import { getServerEnv } from "@/lib/env";
import { MODEL_SLUGS, type ModelRole } from "@/lib/model-slugs";

const models: Partial<Record<ModelRole, ChatOpenAI>> = {};

function createModel(role: ModelRole): ChatOpenAI {
  const env = getServerEnv();

  return new ChatOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    model: MODEL_SLUGS[role],
    temperature: 0,
    maxRetries: 2,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": env.APP_URL,
        "X-OpenRouter-Title": "Locke",
      },
    },
  });
}

export function getModel(role: ModelRole): ChatOpenAI {
  models[role] ??= createModel(role);
  return models[role];
}

export const getPlannerModel = () => getModel("planner");
export const getWorkerModel = () => getModel("worker");
export const getVerifierModel = () => getModel("verifier");
