import { z } from "zod";

import {
  ApplicationLinkStatus,
  Dimension,
  EmployerStatus,
  RecruiterStatus,
  RequestsStatus,
  SafeRouteStatus,
  VacancyStatus,
} from "./status";

/** ISO-8601 UTC timestamp, as produced by `Date.prototype.toISOString()`. */
export const IsoDateTime = z.string().datetime();

/** http(s) URL only. Bare `z.string().url()` also accepts `javascript:`, which the UI would render as a link. */
export const HttpUrl = z.string().url().regex(/^https?:\/\//i, "must be an http(s) URL");

/** Overall Dossier outcome, decided by the pure `decideOutcome()` (SPEC §5). */
export const Outcome = z.enum([
  "verified_route",
  "further_verification",
  "significant_warning",
  "insufficient_evidence",
]);
export type Outcome = z.infer<typeof Outcome>;

/** UI title per outcome (SPEC §5). */
export const OUTCOME_LABELS: Record<Outcome, string> = {
  verified_route: "Verified route available",
  further_verification: "Further verification required",
  significant_warning: "Significant warning indicators",
  insufficient_evidence: "Insufficient evidence",
};

/** Where a piece of evidence came from. Only the first four count as independent (rule G1). */
export const SourceType = z.enum([
  "employer_controlled",
  "ats_board",
  "company_database",
  "registry",
  "web_search",
  "job_board",
  "recruiter_supplied",
  "derived",
]);
export type SourceType = z.infer<typeof SourceType>;

/** Tool names from SPEC §7 (`lib/tools/`). */
export const ToolName = z.enum([
  "extractSignals",
  "redactPii",
  "fetchPage",
  "crustdataIdentify",
  "webSearch",
  "atsLookup",
  "atsDiscover",
  "matchPosting",
  "rdapDomain",
  "dnsRecords",
  "domainSimilarity",
]);
export type ToolName = z.infer<typeof ToolName>;

/** `error.kind` of a failed tool result (SPEC §7). */
export const ToolErrorKind = z.enum([
  "timeout",
  "http",
  "rate_limited",
  "blocked",
  "not_found",
  "invalid_input",
  "parse",
]);
export type ToolErrorKind = z.infer<typeof ToolErrorKind>;

/** One bounded, citable piece of evidence. Content is untrusted data, never instructions. */
export const Evidence = z.object({
  id: z.string().min(1),
  sourceType: SourceType,
  tool: ToolName,
  url: HttpUrl.optional(),
  title: z.string().max(200),
  excerpt: z.string().max(500),
  retrievedAt: IsoDateTime,
  /** True for an ATS board that the official site links to. */
  linkedFromOfficialSite: z.boolean().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

export const Workplace = z.enum(["remote", "hybrid", "onsite"]);
export type Workplace = z.infer<typeof Workplace>;

export const RecruiterChannel = z.enum([
  "email",
  "linkedin",
  "whatsapp",
  "telegram",
  "sms",
  "phone",
  "job_board",
  "other",
  "unknown",
]);
export type RecruiterChannel = z.infer<typeof RecruiterChannel>;

export const RequestKind = z.enum([
  "payment",
  "equipment_purchase",
  "gift_card_or_crypto",
  "check_deposit",
  "id_document",
  "bank_details",
  "tax_id",
  "credentials",
  "other",
]);
export type RequestKind = z.infer<typeof RequestKind>;

export const RequestStage = z.enum(["before_interview", "during_interview", "after_offer", "unknown"]);
export type RequestStage = z.infer<typeof RequestStage>;

/** Essentials the intake node may ask the user for (HITL interrupt). */
export const MissingField = z.enum(["company", "role", "link_or_message"]);
export type MissingField = z.infer<typeof MissingField>;

/** What the opportunity claims, extracted by `intake` from redacted input. All of it is recruiter-supplied. */
export const OpportunityClaim = z.object({
  company: z.object({ name: z.string().optional(), claimedDomain: z.string().optional() }),
  role: z.object({
    title: z.string().optional(),
    location: z.string().optional(),
    workplace: Workplace.optional(),
    employmentType: z.string().optional(),
    compensation: z.string().optional(),
    reqId: z.string().optional(),
  }),
  recruiter: z.object({
    name: z.string().optional(),
    emailDomain: z.string().optional(),
    agency: z.string().optional(),
    channel: RecruiterChannel,
  }),
  suppliedLinks: z.array(HttpUrl),
  requests: z.array(
    z.object({ kind: RequestKind, quote: z.string().max(200), stage: RequestStage }),
  ),
  urgencyCues: z.array(z.string()),
  stageClaimed: z.enum(["cold_outreach", "interview_invite", "offer", "onboarding", "unknown"]),
  missing: z.array(MissingField),
});
export type OpportunityClaim = z.infer<typeof OpportunityClaim>;

/** Deterministic guard rules (SPEC §6.7). */
export const GuardRule = z.enum(["G1", "G2", "G3", "G4", "G5", "G6"]);
export type GuardRule = z.infer<typeof GuardRule>;

/** Verifier verdict per finding (SPEC §6.5). It can only uphold, downgrade, or ask for one recheck. */
export const VerifierVerdict = z.enum(["uphold", "downgrade", "recheck"]);
export type VerifierVerdict = z.infer<typeof VerifierVerdict>;

const findingFor = <D extends Dimension, S extends z.ZodEnum<[string, ...string[]]>>(
  dimension: D,
  status: S,
) =>
  z.object({
    dimension: z.literal(dimension),
    status,
    summary: z.string().max(300),
    reason: z.string().max(500),
    evidenceIds: z.array(z.string()),
    /** Set when the verifier reviewed it; `from` is the status before a downgrade. */
    verifier: z.object({ verdict: VerifierVerdict, from: status.optional(), reason: z.string() }).optional(),
    /** Guard downgrades applied, in order. */
    guard: z.array(z.object({ rule: GuardRule, from: status })).optional(),
  });

/** One Dossier row. Discriminated on `dimension`, so `status` is checked against that dimension. */
export const Finding = z.discriminatedUnion("dimension", [
  findingFor("employer", EmployerStatus),
  findingFor("vacancy", VacancyStatus),
  findingFor("recruiter", RecruiterStatus),
  findingFor("application_link", ApplicationLinkStatus),
  findingFor("requests", RequestsStatus),
  findingFor("safe_route", SafeRouteStatus),
]);
export type Finding = z.infer<typeof Finding>;
/** The finding type for one dimension, e.g. `FindingOf<"vacancy">`. */
export type FindingOf<D extends Dimension> = Extract<Finding, { dimension: D }>;

/** The recommended way to apply. URL must be employer-controlled (invariant G3). */
export const SafeRoute = z.object({
  status: SafeRouteStatus,
  url: HttpUrl.optional(),
  label: z.string().optional(),
  evidenceIds: z.array(z.string()),
  caveat: z.string(),
});
export type SafeRoute = z.infer<typeof SafeRoute>;

/** Fixed next-step catalogue (SPEC §6.8). */
export const NextStepKind = z.enum([
  "apply_via_safe_route",
  "confirm_recruiter_with_employer",
  "do_not_pay",
  "do_not_send_documents",
  "ask_specific_questions",
  "request_missing_info",
  "save_case_link",
]);
export type NextStepKind = z.infer<typeof NextStepKind>;

/** The final report. `dimensions` holds exactly one finding per dimension. No numeric score, ever. */
export const Dossier = z.object({
  outcome: Outcome,
  /** e.g. `R1:application_link=lookalike_destination`. */
  reasonCodes: z.array(z.string()),
  outcomeReason: z.string(),
  headline: z.string(),
  dimensions: z
    .array(Finding)
    .length(6)
    .refine((fs) => new Set(fs.map((f) => f.dimension)).size === 6, {
      message: "must contain exactly one finding per dimension",
    }),
  safeRoute: SafeRoute,
  verified: z.array(z.string()),
  notVerified: z.array(z.string()),
  concerns: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  nextSteps: z.array(z.object({ kind: NextStepKind, text: z.string() })),
  /** Drafted only; Locke never sends it. `to` is an official email or contact-form URL, never the recruiter's. */
  verificationDraft: z
    .object({
      to: z.union([z.string().email(), HttpUrl]).optional(),
      contactEvidenceId: z.string().optional(),
      subject: z.string(),
      body: z.string(),
    })
    .optional(),
  generatedAt: IsoDateTime,
});
export type Dossier = z.infer<typeof Dossier>;

export const Variant = z.enum(["baseline", "improved"]);
export type Variant = z.infer<typeof Variant>;

export const RunStatus = z.enum(["running", "needs_input", "done", "error", "cancelled"]);
export type RunStatus = z.infer<typeof RunStatus>;

/** One graph invocation for a case. */
export const Run = z.object({
  id: z.string().min(1),
  caseId: z.string(),
  variant: Variant,
  scenarioId: z.string().optional(),
  gitSha: z.string(),
  promptVersion: z.string(),
  models: z.object({ planner: z.string(), worker: z.string(), verifier: z.string() }),
  startedAt: IsoDateTime,
  finishedAt: IsoDateTime.optional(),
  status: RunStatus,
  latencyMs: z.number().int().nonnegative().optional(),
  costUsdEstimate: z.number().nonnegative().optional(),
  toolErrors: z.number().int().nonnegative(),
  recoveries: z.number().int().nonnegative(),
  neatlogsTraceUrl: HttpUrl.optional(),
});
export type Run = z.infer<typeof Run>;

/** 22-char unguessable, URL-safe case id. Validate route params with it. */
export const CaseId = z.string().regex(/^[A-Za-z0-9_-]{22}$/, "invalid case id");
export type CaseId = z.infer<typeof CaseId>;

/** A persisted case (one row in `cases`). Input text is already redacted; screenshots are never stored. */
export const Case = z.object({
  id: CaseId,
  createdAt: IsoDateTime,
  input: z.object({ text: z.string().optional(), url: HttpUrl.optional(), hadScreenshot: z.boolean() }),
  status: RunStatus,
  claim: OpportunityClaim.optional(),
  evidence: z.array(Evidence),
  dossier: Dossier.optional(),
  runs: z.array(Run),
});
export type Case = z.infer<typeof Case>;
