import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const serverEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "is required"),
  NEATLOGS_API_KEY: z.string().min(1, "is required"),
  APP_URL: z.string().url("must be a valid URL"),
  DATABASE_URL: optionalString,
  CRUSTDATA_API_KEY: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be read in the browser.");
  }

  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
