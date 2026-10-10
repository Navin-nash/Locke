// TODO(T05): dedupe with lib/tools/result.ts (T05 owns it; minimal copy until it lands on main).
export type ToolErrorKind =
  | "timeout"
  | "http"
  | "rate_limited"
  | "blocked"
  | "not_found"
  | "invalid_input"
  | "parse";

export type ToolError = { kind: ToolErrorKind; message: string; retryable: boolean };

export type ToolResult<T> = { ok: true; data: T } | { ok: false; error: ToolError };

export const toolOk = <T>(data: T): ToolResult<T> => ({ ok: true, data });

export const toolErr = <T>(
  kind: ToolErrorKind,
  message: string,
  retryable: boolean,
): ToolResult<T> => ({ ok: false, error: { kind, message, retryable } });
