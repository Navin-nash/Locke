# Locke: Build Plan (Oct 10 14:00 IST → submission Oct 12)

Rules: AGENTS.md §11-13. Spec: `docs/SPEC.md`. All times are IST. **Submission window: Oct 12
19:00-23:55. Our target is posting by 20:00** (neatlogs and cfo.ai engage with the first 50 quote
tweets).

Every task is 2-4 hours with one harness, one branch, and one PR. "Owns" lists the only paths the
task may edit (plus `package.json` and the lockfile for its own dependencies). Tasks in the same
**wave** run in parallel and are file-disjoint. A harness runs at most 2 tasks at once.

## Milestones and gates

| Milestone | Window | Exit gate |
|---|---|---|
| **M0** Scaffold + trace gate | Oct 10 14:00-18:00 | **Gate 0:** one persisted, correctly nested neatlogs trace (graph node → OpenRouter LLM + tool spans, token counts, final status) for a hello graph with an interrupt/resume. Without it, nothing in M2 starts. |
| **M1** Tools | Oct 10 17:00 → Oct 11 01:00 | All SPEC §7 tools are green under unit tests with fixtures and visible in one trace. |
| **M2** Graph end-to-end | Oct 10 20:00 → Oct 11 12:00 | `POST /run` streams a full Dossier for the 3 demo cases locally. Fixtures are recorded. |
| **M3** UI | Oct 10 18:00 → Oct 11 20:00 | The 3 demo flows work on a Vercel preview with Neon (**Gate 3:** deployed end-to-end). |
| **M4** Evals: baseline → fixes → improved | Oct 11 12:00 → Oct 12 08:00 | `evals/results/summary.json` holds both variants. `unsafe_link_recommended = 0`. At least one fix is driven by neatlogs Fixes. |
| **M5** Polish, brand, demo, business, submit | Oct 12 08:00-20:00 | Video uploaded, README evidence complete, quote-tweet posted. |

## Load by harness (task-hours)

| Harness | Tasks | Hours |
|---|---|---|
| Claude Code | T02 T11 T12 T14 T20 T23 T28 | 23 |
| Codex | T01 (locke-5) T05 T06 T07 T08 T13 T21 T24 T27 | 31 |
| Cursor | T09 T10 T15 T16 T19 T30 | 20 |
| Antigravity | T04 (locke-6) T31 T17 T18 T26 T29 | 19 |

Codex sits at about a third of the 93 task-hours, which is the AGENTS.md §13 ceiling. If it slips,
move T08 to Claude Code (its file set is self-contained) rather than adding Codex sessions.

## Waves (parallel lanes)

| Wave | Start (≈) | Claude Code | Codex | Cursor | Antigravity | Human |
|---|---|---|---|---|---|---|
| W1 | Oct 10 14:00 | T02 | **T01 (locke-5, running)** | n/a | **T04 (locke-6, running)** | **H2** Entire, **H1** keys |
| W2 | 17:00 | T20 | T05, T06 | T09 | T31 | H3 kickoff post |
| W3 | 20:00 | T11 | T07, T08 | T10 | T17 | n/a |
| W4 | Oct 11 00:00 | T12 | T13 | T15 | T18 | n/a |
| W5 | 07:00 | T14 | T27 (preview deploy) | T16 | n/a | H4 Detections, H5 posts |
| W6 | 12:00 | n/a | T21 | T19 | T26 | baseline run (with T21) |
| W7 | 18:00 | T23 | T24 | T30 | n/a | n/a |
| W8 | Oct 12 04:00 | improved run (T23 finish) | n/a | n/a | T29 | n/a |
| W9 | 08:00 | T28 | n/a | n/a | T29 | H6 cfo.ai, H8 Entire export, H7 video, H9 submit |

## Already dispatched (Oct 10, by the orchestrator)

| Task | AO session | Harness | Scope (owned paths) |
|---|---|---|---|
| T01 | `locke-5` | Codex | Next.js scaffold, `package.json`, `lib/env.ts`, `lib/neatlogs.ts`, `lib/models.ts`, the M0 smoke graph (**Gate 0**) |
| T04 | `locke-6` | Antigravity | `brand/`, `public/brand/`, root `DESIGN.md` (tokens, palette, type, motion) |

Don't re-dispatch these. Downstream tasks depend on their merged PRs.

---

## M0: Scaffold and first-trace gate

### T01 Scaffold, pins, CI, neatlogs + models, smoke graph (Codex, 5.5h, W1): dispatched as `locke-5`
- **Depends:** H1 for the keys (H2 should run first so these commits are checkpointed).
- **Owns:** `package.json`, `pnpm-lock.yaml`, `.nvmrc`, `tsconfig.json`, `next.config.ts`,
  `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`, `components.json`,
  `app/layout.tsx` (minimal), `app/page.tsx` (placeholder), `app/globals.css` (Tailwind import only),
  `lib/env.ts`, `lib/neatlogs.ts`, `lib/models.ts`, the smoke graph and its script,
  `.github/workflows/ci.yml`, `.gitignore`.
- **Acceptance:**
  - Next 16.4.0 App Router on pnpm with TS strict plus `noUncheckedIndexedAccess`.
  - Exact pins from AGENTS.md §5, with `pnpm.overrides` forcing a single `@langchain/core@0.3.79`
    (`pnpm why @langchain/core` shows one version).
  - shadcn initialized (Tailwind v4).
  - `lib/env.ts` parses the AGENTS §6 vars with zod and imports `server-only`.
  - Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `evals`, `db:setup`. CI runs
    typecheck, lint, and test. `pnpm build` passes.
  - **Gate 0:** the smoke graph runs 2 nodes (an LLM call through OpenRouter `ChatOpenAI`, one
    `tool()`, and an `interrupt()`/`Command` resume on MemorySaver) with one `langchainHandler()`,
    tags `variant:baseline scenario:gate run:<id>`, and `flush()`. `neatlogs doctor --local --json`
    and `--probe` pass. The trace is persisted with node → LLM/tool nesting and token counts
    (screenshot in the PR plus `evidence/neatlogs/gate.json`).
  - `lib/neatlogs.ts` documents how tags and metadata map.
  - `lib/models.ts` exports the planner, worker, and verifier models plus a price table.
- **Skills:** `shadcn`, `context7`, `neatlogs-ts`, `langgraph-fundamentals`,
  `langgraph-human-in-the-loop`.

### T02 Domain contracts in `lib/types` (Claude Code, 2h, W1, parallel with T01)
- **Depends:** none (adds no dependencies; T01 brings zod).
- **Owns:** `lib/types/**`, `fixtures/streams/sample-uc1.json` (hand-written, schema-valid).
- **Acceptance:** zod schemas for everything in SPEC §8 and the `StreamEvent` union from SPEC §9,
  plus per-dimension status enums and `STATUS_LABELS` / `STATUS_TONE` maps (SPEC §4). One
  hand-written fixture stream of about 40 events lets Cursor start. A vitest test parses every
  fixture against `StreamEvent`.
- **Skills:** `superpowers:writing-plans`, `plan-eng-review`.

### T04 Brand: logo and DESIGN.md (Antigravity, 3h, W1): dispatched as `locke-6`
- **Depends:** none.
- **Owns:** `brand/**`, `public/brand/**`, `DESIGN.md`.
- **Acceptance:** `DESIGN.md` is the source of truth for tokens (palette, status tones, type, spacing,
  radius) and motion, and meets the requirements in SPEC §12, including a contrast table where every
  text and status token is ≥ 4.5:1. Logo sources and exports (SVG mark, wordmark, a favicon legible
  at 16 px, PNG for social). A logo PNG is shared for the kickoff post (H3).
- **Skills:** `logo-design`, `logo-animation`, `svg-animation`, `design-md`, `better-colors`,
  `better-typography`, `brand-motion-guidelines`.

### T31 Implement DESIGN.md tokens, fonts, brand components (Antigravity, 2h, W2)
- **Depends:** T01 (locke-5), T04 (locke-6).
- **Owns:** `app/globals.css` (tokens section), `app/fonts.ts`, `app/icon.svg`, `components/brand/**`.
- **Acceptance:** DESIGN.md tokens become CSS variables wired into the Tailwind theme and the shadcn
  theme vars, with fonts loaded via `next/font`. `LockeMark` (static, plus an animated reveal that is
  static under reduced motion) and `Wordmark` React components. Cursor's T09 switches from shadcn
  defaults to these tokens once this merges.
- **Skills:** `design-md`, `svg-animation`, `accessible-animation`.

---

## M1: Tools (TDD, fixtures, no live network in unit tests)

### T05 Safe fetch and text tools (Codex, 3h, W2)
- **Depends:** T01, T02.
- **Owns:** `lib/net/**`, `lib/tools/extract-signals.ts`, `lib/tools/redact.ts`,
  `lib/tools/fetch-page.ts`, `lib/tools/result.ts` (the shared `ok/error` type and retry helper),
  `lib/tools/faults.ts`, plus their tests and fixtures.
- **Acceptance:** SPEC §7 contracts. The SSRF tests block `127.0.0.1`, `10.x`, `169.254.169.254`,
  IPv6 loopback, a redirect to a private IP, and `file:`. Size and timeout caps are tested.
  `redactPii` covers email local parts, phones, SSN, Aadhaar, PAN, IBAN, and card numbers.
  `extractSignals` covers the money, PII, urgency, and channel lexicons. `LOCKE_FAULTS` parsing is
  tested.
- **Skills:** `superpowers:test-driven-development`, `security-review`.

### T06 Domain tools (Codex, 3h, W2, parallel with T05)
- **Depends:** T01, T02.
- **Owns:** `lib/tools/domain-similarity.ts`, `lib/tools/rdap.ts`, `lib/tools/dns.ts`,
  `lib/tools/lists.ts` (`KNOWN_ATS_HOSTS`, `KNOWN_JOB_BOARDS`, `FREE_WEBMAIL`, `SHORTENERS`), plus
  tests and fixtures.
- **Acceptance:** `domainSimilarity` cases: same, subdomain, typo (`acrne.com`), punycode or Cyrillic
  homoglyph, combosquat (`acme-careers.net`), `job-boards.greenhouse.io`, `linkedin.com/jobs`,
  `gmail.com`, `bit.ly`. RDAP 404 → `registered:false`. DMARC policy parsing. All tools return the
  `result.ts` shape. If T05's `result.ts` hasn't merged yet, copy the type and dedupe in T07.
- **Skills:** `superpowers:test-driven-development`.

### T07 ATS adapters, discovery, matching (Codex, 4h, W3)
- **Depends:** T05.
- **Owns:** `lib/tools/ats/**` (`greenhouse.ts`, `lever.ts`, `ashby.ts`, `smartrecruiters.ts`,
  `workable.ts`, `discover.ts`, `match.ts`, `index.ts`), plus tests and fixtures recorded from real
  boards.
- **Acceptance:** Five adapters normalize to the SPEC §7 posting shape. 404 → `exists:false`. Workable
  endpoint behavior is verified and documented. `atsDiscover` finds a board linked from a fixture
  careers page and marks slug guesses `linkedFromOfficialSite:false`. `matchPosting` handles exact
  `reqId`, "Sr. Software Engineer" vs "Senior Software Engineer", a remote/onsite material diff, and
  no match.
- **Skills:** `superpowers:test-driven-development`, `firecrawl` (ATS docs).

### T08 Crustdata, web search, tool registry (Codex, 2.5h, W3)
- **Depends:** T01 (`lib/models.ts`), T05.
- **Owns:** `lib/tools/crustdata.ts`, `lib/tools/web-search.ts`, `lib/tools/index.ts` (wraps every
  tool as a LangChain `tool()` with name, description, and zod schema), plus tests.
- **Acceptance:** `crustdataIdentify` by name and by domain, with 429 backoff and the fault-injection
  path tested. `webSearch` through the OpenRouter `web` plugin (engine `exa`) returns
  `url_citation`s mapped to results (fixture test). A live smoke test runs under `pnpm test:live`.
  `index.ts` exports every SPEC §7 tool. One trace shows a tool span nested under a node. Confirm
  that the web-plugin `annotations` survive through `ChatOpenAI` (`__includeRawResponse`), and that
  the worker model accepts image input (for the screenshot transcription). Note both results in the
  PR.
- **Skills:** `context7`, `neatlogs-ts`.

---

## M2: Graph end-to-end

### T11 Graph: state, intake + HITL, planner, investigators (Claude Code, 4h, W3)
- **Depends:** Gate 0 (T01 / locke-5), T05, T06. T07 and T08 can be stubbed with fixtures until they merge.
- **Owns:** `lib/agent/state.ts`, `lib/agent/graph.ts`, `lib/agent/nodes/{intake,planner,employer,requests,vacancy,recruiter,channel}.ts`,
  `lib/agent/checkpointer.ts` (`LOCKE_CHECKPOINTER=memory|postgres` factory),
  `lib/agent/prompts/{intake,planner,investigators}.ts`, `lib/agent/emit.ts` (typed `config.writer`),
  `lib/agent/run.ts` (`startRun(caseInput, opts)` / `resumeRun(caseId, answer, opts)` →
  `AsyncIterable<StreamEvent>`. This is the single entry point for the API and the eval runner. It
  owns the handler, tags, and `flush()` in `finally`).
- **Acceptance:** SPEC §6.1-6.4. Phase A/B fan-out via `Send`. Interrupt on a missing company, with
  resume and skip. Every investigator follows its recovery chain and emits `recovery` events plus
  `recovery:*` runnables. Tools are invoked only via `lib/tools/index.ts` with the node config. A
  local script produces provisional findings for the 3 demo inputs. Trace nesting is checked.
- **Skills:** `langgraph-fundamentals`, `langgraph-human-in-the-loop`, `prompt-engineering-patterns`,
  `plan-eng-review`.

### T12 Verifier, guard, outcome, resolver (Claude Code, 4h, W4)
- **Depends:** T02. `outcome.ts`, `safe-route.ts`, `guard.ts`, and `language.ts` can start right
  after T02. Wiring needs T11.
- **Owns:** `lib/agent/{outcome,safe-route,guard,language,contact,next-steps}.ts`,
  `lib/agent/nodes/{verifier,guard,resolver}.ts`, `lib/agent/prompts/{verifier,resolver}.ts`, plus
  tests.
- **Acceptance:** TDD. `decideOutcome` has a table test with at least 1 row per rule R1-R4 and the
  UC1-UC6 shapes. The guard tests cover G1-G6, including "the supplied link becomes the Safe Route
  only with independent evidence" and G6 for an agency. The guard-node order is tested
  (G1/G2/G4/G6 → `selectSafeRoute` → G3), including a fully confirmed case that reaches
  `verified_route` because R2 sees the guarded `safe_route=role_posting_confirmed`. The lattice is enforced (a verifier upgrade
  is rejected). Recheck runs at most once. The language lint rejects the banned words. The resolver
  produces a full `Dossier` for the 3 demo inputs.
- **Skills:** `superpowers:test-driven-development`, `prompt-engineering-patterns`.

### T13 API routes, SSE, Neon persistence (Codex, 4h, W4)
- **Depends:** T01, T02, and the checkpointer factory from T11. It consumes `startRun` and `resumeRun` from T11's
  `lib/agent/run.ts` and runs against a stub iterable until T11 merges.
- **Owns:** `app/api/**`, `lib/db/**` (`client.ts`, `cases.ts`, `schema.sql`), `lib/server/sse.ts`
  (`AsyncIterable<StreamEvent>` → SSE `Response`), `lib/server/rate-limit.ts`, `scripts/db-setup.ts`.
- **Acceptance:** The SPEC §9 routes with zod validation, 404/409/429 paths tested, and redaction
  applied before insert. SSE emits `StreamEvent`s in `seq` order. On abort: the graph is aborted, the
  run is marked `cancelled`, and `flush()` runs in `finally`. `PostgresSaver.setup()` is in
  `db:setup`. `LOCKE_CHECKPOINTER=memory|postgres`. The screenshot vision call runs **without**
  the neatlogs handler, wrapped in the manual `screenshot:transcribe` placeholder span (SPEC §14).
  Tests assert that the DB row, the checkpoint, and the recorded span input and output contain no
  base64.
- **Skills:** `superpowers:test-driven-development`, `langgraph-persistence`, `security-review`.

### T14 Stream integration, fault-injected recovery, fixture recording (Claude Code, 3h, W5)
- **Depends:** T11, T12, T13.
- **Owns:** `lib/agent/nodes/*` (fixes only), `fixtures/streams/{uc1-impersonation,uc2-agency,uc4-fee,recovery}.json`,
  `scripts/record-stream.ts`, `evidence/recovery.md`.
- **Acceptance:** A full run through the API streams to a Dossier for all 3 demo cases. With
  `LOCKE_FAULTS=crustdata:429,careers:blocked`, the run recovers and still yields findings, and the
  trace shows `recovery:*` spans (the trace link goes in `evidence/recovery.md`). Recorded fixtures
  replace the hand-written one and pass the schema test.
- **Skills:** `superpowers:systematic-debugging`, `neatlogs-ts`.

---

## M3: UI (built against fixtures first, then the live API)

### T09 App shell and `/investigate` (Cursor, 3h, W2)
- **Depends:** T01, T02 (tokens from T31 when they land; shadcn defaults until then). Read `DESIGN.md`.
- **Owns:** `app/layout.tsx` (shell, nav, skip link), `app/investigate/**`,
  `components/investigate/**`, `components/ui/**`, `lib/client/pending-upload.ts`,
  `lib/client/samples.ts`.
- **Acceptance:** SPEC §10 `/investigate` with all states. 3 sample buttons. Screenshot drop zone
  with the privacy notice (holds the image in memory only). Keyboard-complete and labelled. Posts to
  `/api/cases` (mocked until T13).
- **Skills:** `shadcn`, `better-layout`, `better-accessibility`, `better-writing`.

### T10 Case live view against fixture streams (Cursor, 4h, W3)
- **Depends:** T02, T09.
- **Owns:** `app/case/[id]/**` (live part), `components/case/**` (`InvestigationMap`, `EvidenceCard`,
  `RecoveryRow`, `ChallengeCard`, `NeedsInputCard`), `components/ai-elements/**`,
  `lib/client/use-case-stream.ts` (fetch + ReadableStream SSE reader with a fixture-replay mode).
- **Acceptance:** Replaying `fixtures/streams/sample-uc1.json` animates the map, streams evidence
  cards (40 ms stagger, reduced-motion instant), shows recovery and challenge rows, and announces
  node-level status via `aria-live`. The needs-input card posts to `/resume`.
- **Skills:** `ai-elements`, `motion-web`, `micro-interaction`, `accessible-animation`,
  `60fps-animation`.

### T15 Dossier view (Cursor, 4h, W4)
- **Depends:** T10.
- **Owns:** `components/dossier/**` (`OutcomeBanner`, `StatusPill`, `DimensionTable`,
  `EvidenceDrawer`, `SafeRouteCard`, `NextSteps`, `VerificationDraft`), and the Dossier section of
  `app/case/[id]`.
- **Acceptance:** SPEC §10 Dossier. All 4 outcome variants and every status label from
  `STATUS_LABELS`. Tone is shown by icon + text + color. The careers-page-only caveat is rendered.
  Copy and `mailto:` on the draft. A mobile stacked layout at 360 px. The disclaimer is present.
- **Skills:** `better-interface`, `better-typography`, `better-colors`, `impeccable`.

### T16 Wire to the live API, error and reload states (Cursor, 3h, W5)
- **Depends:** T13, T14, T15.
- **Owns:** `app/case/[id]/**` (data wiring), `lib/client/**`.
- **Acceptance:** End-to-end on localhost: investigate → live stream → Dossier. Reload restores via
  `GET /api/cases/[id]`. States: cancelled (rerun), error with partial findings, 404. The trace link
  is shown when present.
- **Skills:** `qa`, `superpowers:verification-before-completion`.

### T17 Landing page `/` (Antigravity, 4h, W3)
- **Depends:** T31. A sample Dossier from `fixtures/streams/sample-uc1.json`. It reuses T15's
  `DimensionTable` once merged, and uses its own static markup until then.
- **Owns:** `app/page.tsx`, `components/landing/**`.
- **Acceptance:** SPEC §10 landing: hero with the animated mark, sample Dossier, GSAP ScrollTrigger
  "How Locke investigates" (cleaned up on unmount), trust strip, name story, pricing teaser, and
  credits. Lighthouse performance and accessibility ≥ 90. A reduced-motion variant. Transform and
  opacity only.
- **Skills:** `design-taste-frontend`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`,
  `motion-background`, `motion-pricing`, `gsap-performance`.

### T18 Methodology page `/method` (Antigravity, 3h, W4)
- **Depends:** T31, T02 (it renders labels from `STATUS_LABELS`).
- **Owns:** `app/method/**`, `components/method/**`.
- **Acceptance:** SPEC §10 `/method` content in full: the 7 → 6 mapping, the vocabularies, outcome
  rules in plain words, source hierarchy, never-do list, privacy, and limitations. An animated
  pipeline infographic (static under reduced motion). Copy reviewed against AGENTS.md §2.7.
- **Skills:** `animated-infographic`, `svg-animation`, `better-writing`, `gsap-scrolltrigger`.

### T27 Vercel + Neon preview deploy (Codex, 2h, W5)
- **Depends:** T13, H1 (Vercel and Neon).
- **Owns:** `vercel.json` (only if needed), `README.md` "Run locally / Deploy" section.
- **Acceptance:** A preview URL runs the 3 demo flows with PostgresSaver on Neon. Env vars are set in
  Vercel (names match `.env.example`). `db:setup` is applied. Route duration stays within
  `maxDuration`. **Gate 3** is met.
- **Skills:** `neon-postgres`, `context7` (Vercel).

---

## M4: Evals, baseline → fixes → improved

### T20 Labeled eval cases (Claude Code, 3h, W2; starts early and needs no backend)
- **Depends:** T02.
- **Owns:** `evals/cases/*.json`, `evals/README.md` (labeling rationale).
- **Acceptance:** 25 cases matching the SPEC §15 distribution and schema (validated by a test). The
  real boards and postings in use are listed, with check dates. Every synthetic lookalike domain is
  confirmed unregistered via RDAP. No real people's names.
- **Skills:** `eval-harness`, `exa-search`, `firecrawl`.

### T21 Eval runner, scorer, summary (Codex, 4h, W6)
- **Depends:** T13, T20.
- **Owns:** `scripts/run-evals.ts`, `evals/score.ts` (+ tests), `evals/results/**` (generated).
- **Acceptance:** `pnpm evals --variant baseline|improved [--cases ...]` runs cases with concurrency 2
  through the same graph entry point as the API, tagging each run (AGENTS.md §9). The scorer
  implements every SPEC §15 metric, with unit tests on synthetic results. It writes
  `<variant>.json` plus `summary.json`, and fills trace URLs via the neatlogs CLI lookup by
  `run:<id>`. Then do the **baseline run**: tag the commit `eval-baseline` and commit the results.
- **Skills:** `superpowers:test-driven-development`, `eval-harness`.

### T19 `/evals` scoreboard (Cursor, 3h, W6)
- **Depends:** T02, the T21 `summary.json` shape (start from a hand-made sample).
- **Owns:** `app/evals/**`, `components/evals/**`.
- **Acceptance:** SPEC §10 `/evals`: metric cards with absolute counts, a before/after chart with a
  table alternative, a per-case table with trace links, a "What changed" list, and an empty state.
- **Skills:** `dataviz`, `chart-animation`, `better-accessibility`.

### T23 Agent fixes from neatlogs (Claude Code, 4h, W7)
- **Depends:** the T21 baseline run, H4 (Detections and Fixes reviewed).
- **Owns:** `lib/agent/**` (prompts, nodes, verifier, guard), `PROMPT_VERSION` bump,
  `evals/results/improved.json`.
- **Acceptance:** Each fix cites a neatlogs trace or detection ID, or a Fixes suggestion, in the
  commit body. At least one fix comes from a neatlogs **Fixes** suggestion. The improved run is
  tagged `eval-improved`. `unsafe_link_recommended = 0`. `false_accusation_rate` is ≤ baseline.
  Absolute deltas are recorded in `hackathon.md`.
- **Skills:** `superpowers:systematic-debugging`, `prompt-engineering-patterns`, `neatlogs-ts`.

### T24 Tool fixes from baseline failures (Codex, 3h, W7, parallel with T23)
- **Depends:** the T21 baseline run.
- **Owns:** `lib/tools/**`, `lib/net/**`.
- **Acceptance:** Tool errors and misses seen in the baseline (for example slug discovery or
  redirect handling) are fixed test-first. `tool_error_rate` drops in the improved run.
- **Skills:** `superpowers:test-driven-development`, `superpowers:systematic-debugging`.

### T26 Playwright E2E and accessibility (Antigravity, 3h, W6)
- **Depends:** T16.
- **Owns:** `e2e/**`, `playwright.config.ts`.
- **Acceptance:** Three demo flows run against fixture replay (UC1, UC2, UC4), plus 1 live smoke test
  (skippable without keys). axe shows no serious or critical violations on all 5 pages. A
  reduced-motion run. Wired into `pnpm test:e2e`. Screenshots go to `evidence/screens/`.
- **Skills:** `e2e-testing`, `better-accessibility`.

---

## M5: Polish, demo, business, submission

### T30 UI polish pass (Cursor, 3h, W7)
- **Depends:** T16, T19.
- **Owns:** `components/{case,dossier,evals,investigate}/**`, `app/{investigate,case,evals}/**`.
- **Acceptance:** A `better-interface` review is applied, and empty, error, and loading states are
  verified at 360 px and 1440 px. Page transition from `/investigate` → `/case`. No AA failures.
- **Skills:** `better-interface`, `page-transition-animation`, `emil-design-eng`.

### T28 README, evidence index, docs (Claude Code, 3h, W9)
- **Depends:** T23, H6, H8.
- **Owns:** `README.md` (except T27's section), `evidence/README.md`, `docs/business-plan.md`,
  `hackathon.md`.
- **Acceptance:** README has the pitch, architecture diagram, quickstart, and an **Evidence** section
  linking traces, Detections, Fixes, Entire checkpoints and graph exports, the cfo.ai Page, the
  `/evals` numbers, the video, and the X posts. The business plan summarizes cfo.ai with the glue
  sentence. `hackathon.md` reflects the final state honestly.
- **Skills:** `better-writing`, `superpowers:verification-before-completion`.

### T29 Demo capture assets (Antigravity, 4h, W8-W9)
- **Depends:** T26, T23 (final numbers).
- **Owns:** `evidence/video/**` (raw captures, title cards, captions file).
- **Acceptance:** Clean captures for every SPEC §17 beat (live runs plus fixture-replay fallbacks), a
  logo intro and end card, a 1-frame architecture slide, and a captions `.srt`. Handed to the human
  for voiceover and assembly.
- **Skills:** `after-effects`, `logo-animation`, `shot-composition`.

---

## Human-only tasks

| ID | When | Task |
|---|---|---|
| **H1** | Oct 10 14:00 (now) | Create keys: OpenRouter (credits), neatlogs (project `locke`, API key), Crustdata, Neon (project, `DATABASE_URL`), Vercel (project linked to the GitHub repo). Fill `.env.local` and Vercel env. neatHack check-in (`neatlogs.com/hackathon/check-in`). Ask the Discord questions: judge access to traces, Entire page login, cfo.ai Page acceptability, team rules. |
| **H2** | Oct 10 14:00, **before T01 merges** | Install Entire (`irm https://entire.io/install.ps1 \| iex`). In the repo: `entire enable --agent claude-code`, `entire agent add codex`, `entire agent add cursor` (plus Antigravity if listed), `entire plugin install graph`, `entire status`. Push once and confirm `git ls-remote origin 'refs/entire/checkpoints/*'`. The docs commit predates Entire; that's fine. |
| **H3** | Oct 10 evening | X post 1: kickoff, the problem, and the logo (#neatHack @neatlogs). |
| **H4** | Oct 11 after T14 | neatlogs dashboard: create the 4 custom Detections (SPEC §16). After the baseline, review **Fixes** suggestions and hand them to T23 and T24. |
| **H5** | Oct 11 | X post 2: first trace screenshot. X post 3: recovery clip. Oct 12 morning, X post 4: before/after numbers. |
| **H6** | Oct 12 ~09:00, after T23 | cfo.ai: sign up at `cfo.ai/neathacks`, **cancel the trial right away**, and build the 24-month model with Ari using the SPEC §18 tiers and the neatlogs average cost. Create the scenarios. Share the Page link. Screenshots go to `evidence/cfo/`. X post 5. |
| **H7** | Oct 12 13:00-17:00 | Record the voiceover and assemble the video from the T29 captures (≤ 3:00, captions). Upload it (YouTube unlisted or X native). |
| **H8** | Oct 12 ~11:00 | Entire evidence: `entire checkpoint explain <fix-id> --json`, `entire checkpoint tokens <after> --compare <before>`, `entire graph checkpoint/diff/health` → `evidence/entire/`. neatlogs CLI exports → `evidence/neatlogs/`. |
| **H9** | Oct 12 19:00-20:00 | Merge the final PRs (merge commits), confirm the production URL, quote-tweet the official neatlogs post (team, project, repo, video, live URL), and update the `hackathon.md` Submission section. |

## Cut order if behind schedule
1. Screenshot input (P1). 2. The `/method` animated infographic (keep the static page). 3. Landing
scroll story (keep hero, sample, and CTA). 4. SmartRecruiters and Workable adapters. 5. Verifier
recheck loop (keep the downgrade). **Never cut:** Gate 0, the guard and invariants, the eval
baseline → improved comparison, cfo.ai, the Entire refs push, or the video.
