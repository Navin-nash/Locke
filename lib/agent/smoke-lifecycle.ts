type TelemetryLifecycle = {
  flush: () => Promise<boolean>;
  shutdown: () => Promise<boolean>;
};

export async function closeSmokeTelemetry({
  flush,
  shutdown,
}: TelemetryLifecycle): Promise<void> {
  let flushError: unknown;
  let flushed = false;

  try {
    flushed = await flush();
  } catch (error) {
    flushError = error;
  }

  const shutDown = await shutdown();

  if (flushError) {
    throw flushError;
  }
  if (!flushed) {
    throw new Error("NeatLogs flush did not complete successfully.");
  }
  if (!shutDown) {
    throw new Error("NeatLogs shutdown did not complete successfully.");
  }
}
