import { z } from "zod";

import {
  Dossier,
  Evidence,
  Finding,
  GuardRule,
  IsoDateTime,
  MissingField,
  Outcome,
  ToolErrorKind,
  ToolName,
  Variant,
  VerifierVerdict,
} from "./domain";
import { Dimension, DimensionStatus } from "./status";

/** Graph node names (SPEC §6). The live view lights these up. */
export const AgentNode = z.enum([
  "intake",
  "planner",
  "employer",
  "requests",
  "vacancy",
  "recruiter",
  "channel",
  "verifier",
  "guard",
  "resolver",
]);
export type AgentNode = z.infer<typeof AgentNode>;

/** Fields on every event. `seq` increases strictly within a run. */
const base = { seq: z.number().int().nonnegative(), ts: IsoDateTime, runId: z.string().min(1) };
const event = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ ...base, type: z.literal(type), ...shape });

// Status fields below use the flat DimensionStatus: members of a discriminated union cannot carry
// a refine. The authoritative per-dimension check is on Finding (`finding` and `dossier` events).

/**
 * One SSE event (`event: <type>\ndata: <json>\n\n`), SPEC §9.
 * `needs_input` and `error` end the stream; `run_finished` is the normal last event.
 */
export const StreamEvent = z.discriminatedUnion("type", [
  event("run_started", { caseId: z.string(), variant: Variant }),
  event("node_started", { node: AgentNode, ms: z.number().nonnegative().optional() }),
  event("node_finished", { node: AgentNode, ms: z.number().nonnegative().optional() }),
  event("tool_called", {
    callId: z.string(),
    node: AgentNode,
    tool: ToolName,
    inputSummary: z.string().max(120),
  }),
  event("tool_result", {
    callId: z.string(),
    ok: z.literal(true),
    ms: z.number().nonnegative(),
    summary: z.string().max(200),
  }),
  event("tool_failed", {
    callId: z.string(),
    kind: ToolErrorKind,
    message: z.string(),
    willRetry: z.boolean(),
  }),
  /** A fallback step, traced as `recovery:<dimension>:<from>-><to>`. */
  event("recovery", { dimension: Dimension, from: z.string(), to: z.string(), reason: z.string() }),
  event("evidence", { evidence: Evidence }),
  /** Provisional finding, before the verifier and guard. */
  event("finding", { finding: Finding }),
  event("verifier_challenge", {
    dimension: Dimension,
    verdict: VerifierVerdict,
    fromStatus: DimensionStatus,
    toStatus: DimensionStatus.optional(),
    reason: z.string(),
  }),
  event("guard_violation", {
    rule: GuardRule,
    dimension: Dimension,
    fromStatus: DimensionStatus,
    toStatus: DimensionStatus,
  }),
  event("needs_input", { field: MissingField, question: z.string() }),
  event("dossier", { dossier: Dossier }),
  event("run_finished", {
    outcome: Outcome,
    latencyMs: z.number().nonnegative(),
    costUsdEstimate: z.number().nonnegative().optional(),
  }),
  /** User-safe message only: no stack traces, no keys. */
  event("error", { code: z.string(), message: z.string() }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
export type StreamEventType = StreamEvent["type"];
/** The event type for one `type`, e.g. `StreamEventOf<"finding">`. */
export type StreamEventOf<T extends StreamEventType> = Extract<StreamEvent, { type: T }>;

/** A recorded run, as stored in `fixtures/streams/*.json`. */
export const StreamEvents = z.array(StreamEvent);
