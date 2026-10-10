import { z } from "zod";

/** The six Dossier dimensions (SPEC §4). Order is the Dossier display order. */
export const Dimension = z.enum([
  "employer",
  "vacancy",
  "recruiter",
  "application_link",
  "requests",
  "safe_route",
]);
export type Dimension = z.infer<typeof Dimension>;

/** Q1: is the organization real and identifiable? */
export const EmployerStatus = z.enum([
  "confirmed",
  "conflicting_identity",
  "insufficient_evidence",
  "apparent_impersonation",
]);
export type EmployerStatus = z.infer<typeof EmployerStatus>;

/** Q2: can the vacancy be independently confirmed? `not_independently_located` is never negative. */
export const VacancyStatus = z.enum([
  "officially_confirmed",
  "partially_matched",
  "conflicting_information",
  "not_independently_located",
]);
export type VacancyStatus = z.infer<typeof VacancyStatus>;

/** Q3 + Q4: recruiter and communication. Never "verified" (Locke cannot see email headers). */
export const RecruiterStatus = z.enum([
  "consistent_with_employer",
  "verified_intermediary",
  "could_not_verify",
  "inconsistent_with_practices",
  "apparent_impersonation",
]);
export type RecruiterStatus = z.infer<typeof RecruiterStatus>;

/** Q5: does the supplied application destination match a legitimate hiring channel? */
export const ApplicationLinkStatus = z.enum([
  "matches_employer_channel",
  "matches_intermediary_channel",
  "third_party_job_board",
  "does_not_match",
  "lookalike_destination",
  "could_not_check",
  "not_provided",
]);
export type ApplicationLinkStatus = z.infer<typeof ApplicationLinkStatus>;

/** Q6: suspicious or harmful requests for money or sensitive data. */
export const RequestsStatus = z.enum([
  "none_detected",
  "needs_confirmation",
  "suspicious_request_detected",
]);
export type RequestsStatus = z.infer<typeof RequestsStatus>;

/** Q7: official application destination. Set only by the resolver, never by the verifier. */
export const SafeRouteStatus = z.enum([
  "role_posting_confirmed",
  "careers_page_only",
  "not_established",
]);
export type SafeRouteStatus = z.infer<typeof SafeRouteStatus>;

/** Status enum per dimension. Use it to validate a status against a dimension at runtime. */
export const DIMENSION_STATUSES = {
  employer: EmployerStatus,
  vacancy: VacancyStatus,
  recruiter: RecruiterStatus,
  application_link: ApplicationLinkStatus,
  requests: RequestsStatus,
  safe_route: SafeRouteStatus,
} as const;

/** Status code type for one dimension, e.g. `StatusOf<"vacancy">`. */
export type StatusOf<D extends Dimension> = z.infer<(typeof DIMENSION_STATUSES)[D]>;

/** Any status code from any dimension (flat). Prefer `Finding` for dimension-checked pairs. */
export const DimensionStatus = z.enum([
  ...new Set(Object.values(DIMENSION_STATUSES).flatMap((e) => e.options)),
] as [StatusOf<Dimension>, ...StatusOf<Dimension>[]]);
export type DimensionStatus = z.infer<typeof DimensionStatus>;

/** Display tone: P = positive, N = neutral or uncertain, W = warning (SPEC §4). */
export const Tone = z.enum(["positive", "neutral", "warning"]);
export type Tone = z.infer<typeof Tone>;

/** UI heading for each dimension (SPEC §4 table). */
export const DIMENSION_LABELS: Record<Dimension, string> = {
  employer: "Employer identity",
  vacancy: "Advertised vacancy",
  recruiter: "Recruiter and communication",
  application_link: "Supplied application link",
  requests: "Requests for money or sensitive data",
  safe_route: "Official application destination",
};

/**
 * Exact UI label per status code (SPEC §4). Flat because codes are unique across dimensions,
 * except `apparent_impersonation`, which has the same label and tone in employer and recruiter.
 */
export const STATUS_LABELS: Record<DimensionStatus, string> = {
  confirmed: "Independently confirmed",
  conflicting_identity: "Conflicting identity claims",
  insufficient_evidence: "Insufficient evidence",
  apparent_impersonation: "Apparent impersonation",
  officially_confirmed: "Matching official posting found",
  partially_matched: "Partially matched",
  conflicting_information: "Conflicting information",
  not_independently_located: "Not independently located",
  consistent_with_employer: "Consistent with employer channel",
  verified_intermediary: "Verified agency; employer authorization unconfirmed",
  could_not_verify: "Could not be verified",
  inconsistent_with_practices: "Inconsistent with known hiring practices",
  matches_employer_channel: "Matches established hiring channel",
  matches_intermediary_channel: "Agency's own channel",
  third_party_job_board: "Third-party job board",
  does_not_match: "Does not match established hiring channel",
  lookalike_destination: "Lookalike of employer domain",
  could_not_check: "Could not be checked",
  not_provided: "No link supplied",
  none_detected: "No payment or sensitive-data requests",
  needs_confirmation: "Request needs confirmation",
  suspicious_request_detected: "Suspicious request detected",
  role_posting_confirmed: "Official posting for this role",
  careers_page_only: "Official careers page (exact role unconfirmed)",
  not_established: "No verified route established",
};

/** Tone per status code (SPEC §4). P needs independent evidence (G1); W needs problem evidence (G2). */
export const STATUS_TONE: Record<DimensionStatus, Tone> = {
  confirmed: "positive",
  conflicting_identity: "neutral",
  insufficient_evidence: "neutral",
  apparent_impersonation: "warning",
  officially_confirmed: "positive",
  partially_matched: "neutral",
  conflicting_information: "neutral",
  not_independently_located: "neutral",
  consistent_with_employer: "positive",
  verified_intermediary: "neutral",
  could_not_verify: "neutral",
  inconsistent_with_practices: "neutral",
  matches_employer_channel: "positive",
  matches_intermediary_channel: "neutral",
  third_party_job_board: "neutral",
  does_not_match: "warning",
  lookalike_destination: "warning",
  could_not_check: "neutral",
  not_provided: "neutral",
  none_detected: "positive",
  needs_confirmation: "neutral",
  suspicious_request_detected: "warning",
  role_posting_confirmed: "positive",
  careers_page_only: "positive",
  not_established: "neutral",
};
