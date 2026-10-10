export const MODEL_SLUGS = {
  planner: "openai/gpt-5.6-sol",
  worker: "openai/gpt-5.6-luna",
  verifier: "google/gemini-3.8-flash",
} as const;

export type ModelRole = keyof typeof MODEL_SLUGS;
