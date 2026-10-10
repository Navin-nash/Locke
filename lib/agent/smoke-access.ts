import { timingSafeEqual } from "node:crypto";

type SmokeEnvironment = {
  LOCKE_SMOKE_TOKEN?: string;
  NODE_ENV?: string;
};

export const SMOKE_TOKEN_HEADER = "x-locke-smoke-token";

export function isSmokeEndpointEnabled(
  env: SmokeEnvironment,
  presentedToken?: string | null,
): boolean {
  if (env.NODE_ENV !== "production") {
    return true;
  }

  const configuredToken = env.LOCKE_SMOKE_TOKEN;
  if (!configuredToken || !presentedToken) {
    return false;
  }

  const configured = Buffer.from(configuredToken);
  const presented = Buffer.from(presentedToken);

  return (
    configured.length === presented.length && timingSafeEqual(configured, presented)
  );
}
