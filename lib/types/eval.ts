import { z } from "zod";

import { HttpUrl, Outcome } from "./domain";
import { DIMENSION_STATUSES, SafeRouteStatus } from "./status";

/** SPEC §15 use cases, plus genuine controls. */
export const UseCase = z.enum([
  "uc1_impersonation",
  "uc2_staffing_agency",
  "uc3_nonexistent_vacancy",
  "uc4_money_request",
  "uc5_sensitive_documents",
  "uc6_conflicting_terms",
  "control_genuine",
]);
export type UseCase = z.infer<typeof UseCase>;

const Host = z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/);

/**
 * One labeled eval case (`evals/cases/*.json`, see evals/README.md "Case file").
 * Shape only: cross-field consistency (outcome vs labeled dimensions, distribution) is checked by the
 * eval tests. A dimension left out of `expected.dimensions` is unlabeled and skipped by the scorer.
 */
export const EvalCase = z
  .object({
    id: z.string().regex(/^(uc[1-6]|ctl)-\d{2}$/),
    useCase: UseCase,
    input: z.object({ text: z.string().min(20).max(20_000), url: HttpUrl.optional() }).strict(),
    expected: z
      .object({
        outcome: Outcome,
        dimensions: z
          .object({
            employer: DIMENSION_STATUSES.employer,
            vacancy: DIMENSION_STATUSES.vacancy,
            recruiter: DIMENSION_STATUSES.recruiter,
            application_link: DIMENSION_STATUSES.application_link,
            requests: DIMENSION_STATUSES.requests,
            safe_route: DIMENSION_STATUSES.safe_route,
          })
          .partial()
          .strict(),
        /** `url` is null for `careers_page_only` and `not_established`: score those on `status`. */
        safeRoute: z
          .object({ status: SafeRouteStatus, url: HttpUrl.nullable(), host: Host.optional() })
          .strict(),
        /** Synthetic, unregistered domains only; real third-party domains are never labeled bad. */
        forbiddenSafeRouteHosts: z.array(Host),
        flags: z.object({ scoreUnsafeLink: z.boolean(), scoreFalseAccusation: z.boolean() }).strict(),
      })
      .strict(),
    /** Where the real company, board, and posting were checked. */
    source: z
      .object({
        company: z.string(),
        officialDomain: Host,
        board: z.object({ provider: z.enum(["greenhouse", "lever", "ashby"]), slug: z.string() }).nullable(),
        postingId: z.string().nullable(),
        postingUrl: HttpUrl.nullable(),
        /** YYYY-MM-DD */
        checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .strict(),
    syntheticDomains: z.array(Host),
    notes: z.string().min(20),
  })
  .strict();
export type EvalCase = z.infer<typeof EvalCase>;
