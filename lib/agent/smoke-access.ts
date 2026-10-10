type SmokeEnvironment = {
  CI?: string;
  NODE_ENV?: string;
};

export function isSmokeEndpointEnabled(env: SmokeEnvironment): boolean {
  return (
    env.NODE_ENV === "development" ||
    env.NODE_ENV === "test" ||
    env.CI?.toLowerCase() === "true"
  );
}
