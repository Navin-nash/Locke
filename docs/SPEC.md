# Locke: Product Spec (V1, neatHack 2026)

> **Locke: know who's really hiring. Evidence before trust.**
> This is the source of truth for product behavior. AGENTS.md covers engineering process.
> `docs/PLAN.md` covers who builds what, and when. Section numbers are stable, so cite them as "SPEC §5".

---

## 1. Problem, users, positioning

**Problem.** Recruitment is spread across the company, its HR staff, outside agencies, job boards,
ATS sites, and channels like email, LinkedIn, and WhatsApp. A real logo or a real job description
does not prove that the sender is authorized to recruit. **The risk is usually not the job itself. It
is whether the recruitment interaction is authentic, and the route the candidate is asked to take.**
The harms are lost money (fees, deposits, equipment), exposed personal data (ID, bank details), lost
time, emotional stress, and **missed real opportunities**, because overly aggressive scam detectors
scare people away from genuine jobs. Locke addresses both risks.

**Users.** Primary: job seekers, students, fresh graduates, remote workers, and career switchers.
Secondary: university career centers, recruitment platforms, and (later) employers.

**The question Locke answers:** *"I received this job opportunity. Can I trust it, what evidence
supports it, and how can I proceed safely if it is genuine?"*

**Positioning.** Locke investigates; it does not just classify. It treats **employer, vacancy,
recruiter, and application channel as separate questions**, and it finds the legitimate route
instead of only issuing a warning. "Insufficient evidence, and here is how to get it safely" is a
valid, useful result.

**Name.** John Locke, the empiricist: knowledge comes from evidence, not assertion. Also a *lock*:
the thing that keeps you safe. Brand line: **"Evidence before trust."**

## 2. V1 scope and cuts

**In V1:**
1. Accept pasted message text, a job or application URL, and (P1) a screenshot.
2. Extract the organization, role, recruiter claims, supplied links, and requests. Ask for missing
   essentials through a human-in-the-loop interrupt.
3. Establish the employer's public presence and official domain.
4. Find a matching official vacancy through public ATS APIs and the careers page.
5. Examine the recruiter channel and the supplied application destination.
6. Detect payment and sensitive-data requests and urgency pressure.
7. Run an adversarial verifier plus deterministic invariant guards.
8. Produce a Dossier with six dimensions, one of four outcomes, a Safe Route when one is established,
   next steps, and a verification-email draft.
9. Live investigation view, a public eval scoreboard, and a methodology page.

**Explicit cuts (do not build):** accounts and auth (cases are anonymous, linked by an unguessable
ID); multi-message case threads (use case 7, phase 2); sending email or contacting anyone; auto-apply;
background checks on private individuals; a browser extension; payments; monitoring and recheck
jobs; storing uploaded documents; dark mode; i18n.
**Stretch, only if M5 has slack:** a Dodo Payments test-mode "Pro" payment link on the pricing
section; a "recheck this case" button.

## 3. Journey

Discovery (`/`) → Submission (`/investigate`) → Investigation (live `/case/[id]`) → Explanation
(Dossier) → Recommended action (Safe Route, next steps, draft) → Outcome (the user acts) → optional
revisit via the case link. It should feel like a careful, independent investigator, not a chatbot.

## 4. Seven questions → six Dossier dimensions

| # | Investigation question | Dossier dimension (`Dimension`) |
|---|---|---|
| Q1 | Is the organization real and identifiable? | `employer`: Employer identity |
| Q2 | Can the vacancy be independently confirmed? | `vacancy`: Advertised vacancy |
| Q3 | Is the communication consistent with the employer's known hiring practices? | `recruiter`: Recruiter and communication |
| Q4 | Is there credible evidence connecting the recruiter to the employer? | `recruiter` (same dimension as Q3) |
| Q5 | Does the supplied application destination match a legitimate hiring channel? | `application_link`: Supplied application link |
| Q6 | Are there suspicious or harmful requests? | `requests`: Requests for money or sensitive data |
| Q7 | If unreliable, can the user reach the genuine opportunity another way? | `safe_route`: Official application destination |

### Status vocabularies (exact codes → UI labels)

Tone: **P** = positive, **N** = neutral or uncertain, **W** = warning. Each P status needs
independent evidence (rule G1). Each W status needs positive problem evidence (rule G2).

**`employer`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `confirmed` | Independently confirmed | P | An official domain was established. It is reachable, and it is corroborated by Crustdata or by at least 2 independent search results. RDAP age is at least 180 days when RDAP is available. |
| `conflicting_identity` | Conflicting identity claims | N | Several organizations match, or the claimed details contradict the established entity. |
| `insufficient_evidence` | Insufficient evidence | N | No organization could be established. |
| `apparent_impersonation` | Apparent impersonation | W | The message claims to be the employer while using a lookalike of the established official domain. |

**`vacancy`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `officially_confirmed` | Matching official posting found | P | An `exact` or `strong` match on an employer-controlled source (the official site, or an ATS board linked from it). |
| `partially_matched` | Partially matched | N | Similar role on an employer source with non-material differences, or a match found only on a third-party job board or an unlinked ATS board. |
| `conflicting_information` | Conflicting information | N | An official posting exists, but material terms differ (remote vs onsite, salary band, employment type, location). |
| `not_independently_located` | Not independently located | N | No matching posting was found. **This is not a negative signal.** Real roles can be unadvertised, confidential, or expired. |

**`recruiter`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `consistent_with_employer` | Consistent with employer channel | P | The sender's domain is the official domain (which enforces DMARC), or an employer source lists the recruiter or agency. Locke cannot see email headers, so this is never called "verified". |
| `verified_intermediary` | Verified agency; employer authorization unconfirmed | N | The agency itself is established (Crustdata or official site), but no employer source confirms the partnership. |
| `could_not_verify` | Could not be verified | N | No independent evidence links the sender to the employer. A different domain or webmail lands here, and it is **not** a warning. |
| `inconsistent_with_practices` | Inconsistent with known hiring practices | N | Off-platform pushes (WhatsApp or Telegram interviews), chat-only interviews, or free webmail while claiming to be employer HR. Shown as a concern, but not a warning trigger on its own. |
| `apparent_impersonation` | Apparent impersonation | W | The sender uses a lookalike of the official domain, or a brand-in-domain combosquat (for example `acme-hr-careers.com`). |

**`application_link`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `matches_employer_channel` | Matches established hiring channel | P | The final host is the official domain or a subdomain of it, or an ATS board linked from the official site. |
| `matches_intermediary_channel` | Agency's own channel | N | The host belongs to a `verified_intermediary` agency. It is not employer-controlled. |
| `third_party_job_board` | Third-party job board | N | LinkedIn, Indeed, Naukri, Wellfound, Glassdoor, Foundit, and similar. |
| `does_not_match` | Does not match established hiring channel | W | The final host is unrelated to every established channel, which requires that an employer channel **was** established. A recognized ATS host whose slug is not linked to the employer also lands here. |
| `lookalike_destination` | Lookalike of employer domain | W | Typosquat, homoglyph, punycode, or combosquat of the official domain. |
| `could_not_check` | Could not be checked | N | No employer channel was established to compare against, or the URL was unparseable. |
| `not_provided` | No link supplied | N | |

**`requests`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `none_detected` | No payment or sensitive-data requests | P | |
| `needs_confirmation` | Request needs confirmation | N | A sensitive-data request at a plausible stage (for example tax or ID forms after an offer), or a vague request. Confirm through an employer-controlled channel. |
| `suspicious_request_detected` | Suspicious request detected | W | Any payment, deposit, fee, equipment purchase, gift card, crypto, or check-cashing request. Or ID, bank details, or credentials requested before an interview or offer, or through an unverified channel. Or urgency combined with secrecy. |

**`safe_route`**
| Code | UI label | Tone | Meaning |
|---|---|---|---|
| `role_posting_confirmed` | Official posting for this role | P | The exact posting URL on an employer-controlled source. |
| `careers_page_only` | Official careers page (exact role unconfirmed) | P | Only the general careers page was verified. The UI must say the exact role is unconfirmed. |
| `not_established` | No verified route established | N | |

## 5. Overall outcomes and decision rules

`decideOutcome(findings) → { outcome, reasonCodes[] }` is pure, deterministic, and unit-tested. It
runs in the resolver, **after** the guard has finished, including Safe Route selection and G3
(§6.7). It therefore reads the guarded `safe_route` finding. Rules are evaluated in order, and the
first match wins.

| # | Outcome (`Outcome`) | UI title | Rule |
|---|---|---|---|
| R1 | `significant_warning` | Significant warning indicators | any of: `employer=apparent_impersonation`, `recruiter=apparent_impersonation`, `application_link ∈ {lookalike_destination, does_not_match}`, `requests=suspicious_request_detected` |
| R2 | `verified_route` | Verified route available | `safe_route=role_posting_confirmed` **and** `vacancy=officially_confirmed` |
| R3 | `further_verification` | Further verification required | any of: `employer ∈ {confirmed, conflicting_identity}`, `vacancy ∈ {officially_confirmed, partially_matched, conflicting_information}`, `safe_route=careers_page_only` |
| R4 | `insufficient_evidence` | Insufficient evidence | otherwise |

Definitions shown to users:
- **Verified route available:** an authentic application destination was established. This does not
  guarantee the recruiter's claims or the final terms.
- **Further verification required:** some information is credible, but a critical part is
  unauthenticated.
- **Significant warning indicators:** material concerns were found, such as a misleading
  destination, impersonation, or an unexpected payment request. This is **not** a claim that the job
  is fraudulent.
- **Insufficient evidence:** authenticity could not be established. The Dossier lists what evidence
  is missing and how to get it safely.

Notes: under R1, the Safe Route is still shown when one exists (UC1: "the vacancy may be real; apply
here instead"). The reason codes (for example `R1:application_link=lookalike_destination`) drive the
deterministic `outcomeReason` sentence and the next-step selection.

### Safe Route selection (`selectSafeRoute`, deterministic)
This runs **inside the guard node**, after G1, G2, G4, and G6 have settled the other findings and
before G3 validates the result (see the order in §6.7). The output is written as the `safe_route`
finding plus `state.safeRoute`.
1. If `vacancy=officially_confirmed`, use the matched posting's URL from the ATS API or the official
   site → `role_posting_confirmed`.
2. Otherwise, if the official careers page (on the official domain, or a linked ATS board root) was
   fetched successfully → `careers_page_only`.
3. Otherwise → `not_established`.

Invariant check (G3): the chosen URL's registrable domain is the official domain, or the URL lies on
a board with `linkedFromOfficialSite=true`. Its evidence `sourceType` is not `recruiter_supplied`. If
the URL equals a supplied link, the same URL must also appear in independent evidence.

### Verification contact (`findVerificationContact`, deterministic)
Use a `mailto:` or contact-form URL found on official-domain pages (careers, contact, or
security/fraud-notice pages), preferring addresses like `careers@`, `recruiting@`, `talent@`, or
`jobs@`. **Never use the recruiter's address or a recruiter-supplied link.** If nothing is found, the
draft has no `to` and the UI says "Send via the contact options on <official careers page>".

## 6. Agent graph

LangGraph.js `StateGraph`, compiled with a checkpointer (MemorySaver locally on day 1, PostgresSaver
afterwards). `thread_id = caseId`. Models (`lib/models.ts`): **planner** `openai/gpt-5.6-sol`,
**worker** `openai/gpt-5.6-luna`, **verifier** `google/gemini-3.8-flash`. All run at temperature 0
with structured output (zod), through OpenRouter. Prompts live in `lib/agent/prompts/*.ts` with
`PROMPT_VERSION`.

**Budgets per run:** p50 target ≤ 60 s, hard cap 150 s (an `AbortSignal` cascades); per investigator
≤ 45 s; LLM calls ≤ 14; `webSearch` ≤ 3; page fetches ≤ 8; at most 1 verifier recheck loop. When the
budget runs out, the current node finishes with an uncertain status rather than failing the run.

### 6.1 State (`lib/agent/state.ts`)
`caseId, runId, variant, input: { text, url? }` (redacted), `claim?: OpportunityClaim`,
`plan?: Plan`, `employerContext?: { officialDomain, careersUrl?, atsBoards: AtsBoard[], agencyDomain? }`,
`evidence: Evidence[]` (append reducer, deduped by id), `findings: Partial<Record<Dimension, Finding>>`
(merge reducer), `challenges: Challenge[]`, `recheckCount: number`, `guardViolations: GuardViolation[]`,
`safeRoute?: SafeRoute`, `dossier?: Dossier`.

### 6.2 `intake` (worker model)
- Input: the redacted text, the URL, and `extractSignals(text)` output. A screenshot has already been
  transcribed and redacted by the route (§9).
- Output: an `OpportunityClaim` from structured output, merged with the deterministic signals. The
  deterministic signals win on URLs and emails.
- **HITL:** if `claim.missing` includes `company`, call `interrupt({ kind: "needs_input", field:
  "company", question: "Which company does this opportunity say it's from?" })`. If text, URL, and
  role are all missing, ask for the message or link. There are at most 2 interrupts per run. The user
  may answer `skip`, and the run continues with what it has. The interrupt comes before any side
  effects, because the node replays on resume.

### 6.3 `planner` (planner model)
- Output `Plan`: `{ dimensions: Dimension[], skips: { dimension, reason }[], officialDomainHints:
  string[], atsHints: { provider, slug }[], searchQueries: string[] (≤3), rationale: string }`.
- Deterministic post-filter: any hint whose registrable domain equals a recruiter-supplied or sender
  domain is tagged `fromRecruiter: true` and can never seed the official domain.
- Skips are explicit, for example "no link supplied" → `application_link=not_provided`.

### 6.4 Investigators
Each investigator calls tools only through `lib/tools/index.ts` with the node `config`. It emits
`tool_called`, `tool_result`, `evidence`, and `recovery` events. It returns `{ evidence[], findings:
{ [dimension]: Finding } }` plus any context. Phase A runs `employer` and `requests` in parallel.
Phase B runs `vacancy`, `recruiter`, and `channel` in parallel, using `Send` after the employer
finishes.

| Node | Tools (in recovery order) | Worker LLM use | Produces |
|---|---|---|---|
| `employer` | `crustdataIdentify(name)` → `webSearch("<company> official website")` → `fetchPage(home)` → `rdapDomain` | Disambiguate candidates (name collisions, subsidiaries) | `employer` finding, `employerContext.officialDomain`, `careersUrl` |
| `requests` | `extractSignals` (no network) | Classify each cue: request kind, stage, channel | `requests` finding |
| `vacancy` | `atsDiscover` → `atsLookup` → `matchPosting` → slug-guess `atsLookup` → `webSearch("site:<official> <title>")` | Tie-break between the top 3 `matchPosting` candidates; judge whether a diff is material | `vacancy` finding, `atsBoards` |
| `recruiter` | `domainSimilarity({ candidate: senderDomain, officialDomains: [employerContext.officialDomain], brand })` → `dnsRecords(official)` → `crustdataIdentify(agency domain)` → `webSearch("site:<official> <agency>")` | Judge practice consistency (off-platform pushes, chat-only interviews) | `recruiter` finding |
| `channel` | `fetchPage(supplied)` for the redirect chain → `domainSimilarity` on **both** the initial and the final host, each with `officialDomains = [employerContext.officialDomain, ...linked ATS board hosts]` → `rdapDomain(final)` | none | `application_link` finding. The worse relation of the two hosts wins. |

**Comparison base rule:** `domainSimilarity` must always compare against the established employer
channels: `employerContext.officialDomain` plus the ATS boards with `linkedFromOfficialSite=true`.
These come from non-recruiter evidence in phase A. A recruiter-supplied URL, a redirect hop, or a
sender domain must never be passed as `officialDomains`. Otherwise a direct attacker link compared
with itself would report `same`. If no employer channel was established, `application_link` is
`could_not_check` (G4) and `recruiter` is `could_not_verify`. A unit test asserts that a supplied link
on an unrelated domain never yields `matches_employer_channel`.

Recovery is a first-class step. Each fallback is a traced runnable `recovery:<dimension>:<from>-><to>`
and emits a `recovery` event. Exhausting a chain yields the dimension's uncertain status, never a
warning.

### 6.5 `verifier` (verifier model: a different model family, isolated)
- Input: the claim, all findings, and bounded evidence (`<untrusted_source>`-wrapped). It does not see
  investigator reasoning.
- Rubric, asked for each finding: (1) Is every supporting evidence item independent of the
  recruiter? (2) Does the evidence refer to *this* employer and *this* role (name collisions,
  regions, subsidiaries)? (3) Is an absence of evidence being treated as a negative? (4) Does the
  status overstate the evidence? (5) For W statuses: is a concrete problem signal quoted?
- Output `Challenge[]`: `{ dimension, verdict: "uphold"|"downgrade"|"recheck", toStatus?, reason,
  hint? }`. A downgrade may only move along the lattice: P → N, or W → N (the dimension's uncertain
  status). `recheck` is allowed only when `recheckCount === 0`, and only for `vacancy`, `recruiter`,
  or `channel`. It re-runs those investigators once with the hint. Each challenge emits a
  `verifier_challenge` event.

### 6.6 Downgrade lattice
`employer`: confirmed → conflicting_identity → insufficient_evidence; apparent_impersonation →
insufficient_evidence. `vacancy`: officially_confirmed → partially_matched →
not_independently_located; conflicting_information → partially_matched. `recruiter`:
consistent_with_employer / verified_intermediary → could_not_verify; apparent_impersonation →
could_not_verify. `application_link`: matches_* → could_not_check; does_not_match /
lookalike_destination → could_not_check; does_not_match → matches_intermediary_channel (G6 only). `requests`: suspicious_request_detected → needs_confirmation.
`safe_route` is never set by the verifier. It is computed by the guard node (§6.7).

### 6.7 `guard` (deterministic, `lib/agent/guard.ts`)
| Rule | Check | Action |
|---|---|---|
| G1 independence | A P status needs ≥1 evidence item with `sourceType ∈ {employer_controlled, ats_board (linked), company_database, registry}` | Downgrade along the lattice |
| G2 positive-evidence | A W status needs a `derived` similarity result or a quoted request, not an absence | Downgrade to the uncertain status |
| G3 Safe Route | The Safe Route invariant (§5) | Fall back to `careers_page_only` or `not_established` |
| G4 comparison base | `does_not_match` **and** `matches_employer_channel` both require an established employer channel. A `matches_employer_channel` finding must also cite `employer_controlled` or linked `ats_board` evidence for the matched host. | → `could_not_check` |
| G5 language | No banned words (AGENTS.md §2.7) in resolver prose | Regenerate once, then fall back to template prose |
| G6 intermediary reconciliation | `application_link=does_not_match` and the link's registrable domain equals the sender's own (non-webmail) domain while the sender presents as an agency | Becomes `matches_intermediary_channel` if `recruiter=verified_intermediary`, otherwise `could_not_check` ("the agency's own site; the agency is not established"). This exists because `channel` and `recruiter` run in parallel; it prevents UC2 false accusations. |

**Order inside the guard node** (fixed, and tested):
1. Apply G1, G2, G4, and G6 to the investigator and verifier findings.
2. `selectSafeRoute` (§5) on the guarded findings produces the candidate route.
3. G3 validates the candidate. If it fails, fall back to `careers_page_only` or `not_established`.
4. Write the `safe_route` finding and `state.safeRoute`.

G5 is not part of this node. It runs in the resolver on the generated prose (§6.8).

Each violation is a traced runnable `guard:<rule>` and a `guard_violation` event. In a correct run,
the guard fires rarely. The Detections in neatlogs watch for it.

### 6.8 `resolver`
1. `decideOutcome` (§5) on the guarded findings, including the guard-computed `safe_route`, then
   `findVerificationContact`. Both are deterministic. The resolver never re-selects or alters the
   Safe Route.
2. Next steps come from a fixed catalogue chosen by statuses: `apply_via_safe_route`,
   `confirm_recruiter_with_employer`, `do_not_pay`, `do_not_send_documents`, `ask_specific_questions`
   (UC6: one question per material diff), `request_missing_info`, `save_case_link`.
3. The worker LLM writes the `headline`, the `verified`, `notVerified`, `concerns`, and
   `missingEvidence` bullets, the next-step text, and the `verificationDraft` (subject and body,
   polite, factual, and free of accusations). The G5 lint runs on all of it.
4. Persist the Dossier and emit `dossier`, then `run_finished`.

## 7. Tool contracts (`lib/tools/`, Codex)

Common rules: zod input and output. Results are `{ ok: true, data } | { ok: false, error: { kind:
"timeout"|"http"|"rate_limited"|"blocked"|"not_found"|"invalid_input"|"parse", message, retryable } }`.
One retry on `timeout`, 5xx, or 429 (backoff 500 ms, honoring `Retry-After` ≤ 3 s), then return the
error. `LOCKE_FAULTS` (non-production only; for example `crustdata:429,careers:blocked,ats:timeout`)
forces a failure for recovery demos and evals. Output to an LLM is capped at 4,000 characters.

| Tool | Input | Output (`data`) | Timeout | Notes |
|---|---|---|---|---|
| `extractSignals` | `{ text ≤ 20k }` | `{ urls[], emails[], phones[], channels: ("whatsapp"\|"telegram"\|"signal"\|"sms"\|"personal_email")[], moneyCues: {phrase, kind}[], piiCues: {phrase, kind}[], urgencyCues: string[] }` | n/a | Regex plus a lexicon. Pure. |
| `redactPii` | `{ text }` | `{ text, redactions: {kind, count}[] }` | n/a | Masks the email local part (`j***@domain` keeps the domain), phones, government IDs (SSN, Aadhaar, PAN, passport patterns), IBAN, card and account numbers, and OTP-like codes. Pure. |
| `fetchPage` | `{ url }` | `{ finalUrl, status, redirectChain: {url, status}[], title, text ≤ 4000, links: {href, text}[] ≤ 50, contentType }` | 8 s | Uses `lib/net/safe-fetch.ts` (SSRF guard: http(s) on ports 80/443, DNS resolved and private, loopback, and link-local addresses blocked on every hop, ≤ 5 redirects, ≤ 1 MB, text/html, json, or plain only, UA `LockeBot/0.1 (+APP_URL/method)`). On a JS-only or blocked page it returns `ok:false, kind:"blocked"`. |
| `crustdataIdentify` | `{ name } \| { domain }` | `{ matches: { name, domain?, linkedinUrl?, headcount?, foundedYear?, hq?, rank }[] ≤ 3 }` | 8 s | `POST https://api.crustdata.com/company/identify`, headers `authorization: Bearer`, `x-api-version: 2025-11-01`. One identifier per call. 30 rpm, so evals use concurrency ≤ 2. The vendor `confidence_score` → `rank` is used internally for ordering and **never shown**. |
| `webSearch` | `{ query ≤ 200, maxResults ≤ 5 }` | `{ results: { url, title, snippet ≤ 500 }[] }` | 20 s | OpenRouter **web plugin** through `ChatOpenAI` (worker model, `modelKwargs.plugins: [{ id: "web", engine: "exa", max_results }]`), parsing `message.annotations[].url_citation`. Why: no extra vendor or key, the same neatlogs trace, about $0.007 per search, and engine pinned to `exa` for consistent results across models. Results are `sourceType: "web_search"` (or `job_board` by host). |
| `atsLookup` | `{ provider: "greenhouse"\|"lever"\|"ashby"\|"smartrecruiters"\|"workable", slug }` | `{ exists, boardUrl, companyName?, website?, postings: { id, title, location?, workplace?: "remote"\|"hybrid"\|"onsite", employmentType?, department?, compensation?, url, updatedAt? }[] }` | 6 s | Greenhouse `GET boards-api.greenhouse.io/v1/boards/{slug}/jobs`; Lever `GET api.lever.co/v0/postings/{slug}?mode=json`; Ashby `GET api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`; SmartRecruiters `GET api.smartrecruiters.com/v1/companies/{slug}/postings`; Workable `GET apply.workable.com/api/v1/widget/accounts/{slug}` (unofficial; verify in T07). A 404 means `exists:false` (`ok:true`). Normalized and capped at 200 internally. |
| `atsDiscover` | `{ officialDomain, companyName, careersUrl? }` | `{ boards: { provider, slug, linkedFromOfficialSite, sourceUrl }[], careersUrl? }` | 15 s total | Scan `/careers`, `/jobs`, and the homepage for ATS hosts (`boards.greenhouse.io/`, `job-boards.greenhouse.io/`, `jobs.lever.co/`, `jobs.ashbyhq.com/`, `careers.smartrecruiters.com/`, `jobs.smartrecruiters.com/`, `apply.workable.com/`) in links and scripts. Then try slug guesses from the company name and domain label (marked `linkedFromOfficialSite:false` unless board data names the official domain). |
| `matchPosting` | `{ claim: { title, location?, workplace?, employmentType?, reqId?, compensation? }, postings }` | `{ candidates: { postingId, match: "exact"\|"strong"\|"partial"\|"none", diffs: { field, claimed, official, material }[] }[] ≤ 3 }` | n/a | Normalized title token-set similarity with a seniority and synonym map. A `reqId` equality → `exact`. Material fields: workplace, location country, employment type, compensation band (more than 20% apart). Pure. |
| `rdapDomain` | `{ domain }` | `{ registrableDomain, registered: boolean, createdAt?, ageDays?, registrar? }` | 5 s | `GET https://rdap.org/domain/{d}`. A 404 means `registered:false`. A failure is **never** suspicious on its own. |
| `dnsRecords` | `{ domain }` | `{ mx: string[], spf?: string, dmarcPolicy?: "none"\|"quarantine"\|"reject" }` | 3 s per query | DNS-over-HTTPS: `https://cloudflare-dns.com/dns-query?name=..&type=MX\|TXT` with `accept: application/dns-json`, and `_dmarc.<domain>` TXT. |
| `domainSimilarity` | `{ candidate: url\|domain, officialDomains: string[], brand }` | `{ relation: "same"\|"subdomain_of_official"\|"linked_ats_board"\|"known_ats"\|"known_job_board"\|"free_webmail"\|"shortener"\|"lookalike"\|"brand_in_unrelated_domain"\|"unrelated", signals: string[] }` | n/a | `tldts` for registrable domains, edit distance ≤ 2, a homoglyph map (rn→m, 0→o, l→1, Cyrillic), punycode, and brand-plus-keyword combosquat (`-careers`, `-hr`, `-jobs`, `-recruit`). Static lists: `KNOWN_ATS_HOSTS`, `KNOWN_JOB_BOARDS`, `FREE_WEBMAIL`, `SHORTENERS`. Pure. |

## 8. Data model (`lib/types`, zod)

```ts
Dimension  = "employer"|"vacancy"|"recruiter"|"application_link"|"requests"|"safe_route"
Outcome    = "verified_route"|"further_verification"|"significant_warning"|"insufficient_evidence"
SourceType = "employer_controlled"|"ats_board"|"company_database"|"registry"
           | "web_search"|"job_board"|"recruiter_supplied"|"derived"

Evidence { id; sourceType; tool; url?; title ≤200; excerpt ≤500; retrievedAt: ISO;
           linkedFromOfficialSite?: boolean }

OpportunityClaim {
  company:   { name?; claimedDomain? }
  role:      { title?; location?; workplace?: "remote"|"hybrid"|"onsite"; employmentType?; compensation?; reqId? }
  recruiter: { name?; emailDomain?; agency?; channel: "email"|"linkedin"|"whatsapp"|"telegram"|"sms"|"phone"|"job_board"|"other"|"unknown" }
  suppliedLinks: url[]
  requests:  { kind: "payment"|"equipment_purchase"|"gift_card_or_crypto"|"check_deposit"|"id_document"
                    |"bank_details"|"tax_id"|"credentials"|"other"; quote ≤200;
               stage: "before_interview"|"during_interview"|"after_offer"|"unknown" }[]
  urgencyCues: string[]; stageClaimed: "cold_outreach"|"interview_invite"|"offer"|"onboarding"|"unknown"
  missing: ("company"|"role"|"link_or_message")[]
}

Finding { dimension; status /* validated per dimension, §4 */; summary ≤300; reason ≤500;
          evidenceIds: string[];
          verifier?: { verdict: "uphold"|"downgrade"|"recheck"; from?; reason };
          guard?: { rule: "G1"|"G2"|"G3"|"G4"|"G5"|"G6"; from }[] }

SafeRoute { status: "role_posting_confirmed"|"careers_page_only"|"not_established";
            url?; label?; evidenceIds: string[]; caveat: string }

Dossier { outcome; reasonCodes: string[]; outcomeReason; headline;
          dimensions: Finding[6]; safeRoute: SafeRoute;
          verified: string[]; notVerified: string[]; concerns: string[]; missingEvidence: string[];
          nextSteps: { kind; text }[];
          verificationDraft?: { to?; contactEvidenceId?; subject; body };
          generatedAt: ISO }

Run  { id; caseId; variant: "baseline"|"improved"; scenarioId?; gitSha; promptVersion;
       models: { planner; worker; verifier }; startedAt; finishedAt?;
       status: "running"|"needs_input"|"done"|"error"|"cancelled";
       latencyMs?; costUsdEstimate?; toolErrors: number; recoveries: number; neatlogsTraceUrl? }

Case { id /* 22-char random, unguessable */; createdAt;
       input: { text?: string /* redacted */; url?; hadScreenshot: boolean };
       status: Run["status"]; claim?; evidence: Evidence[]; dossier?; runs: Run[] }
```

**Storage (Neon).** One table, plus PostgresSaver's own tables (created by `.setup()` in
`scripts/db-setup.ts`):
```sql
create table if not exists cases (
  id text primary key, created_at timestamptz not null default now(),
  status text not null, input jsonb not null, claim jsonb, evidence jsonb not null default '[]',
  dossier jsonb, runs jsonb not null default '[]'
);
```
`costUsdEstimate` is token usage × the price table in `lib/models.ts`, plus the search fees. The
neatlogs cost column is authoritative for cfo.ai. `neatlogsTraceUrl` is filled by the eval runner and
for demo cases (§15). The TS SDK returns no URL at runtime.

## 9. API routes and streaming protocol (`app/api`, Codex)

All routes: `runtime = "nodejs"`, `maxDuration = 300`, zod-validated bodies, JSON errors
`{ error: { code, message } }`, and an in-memory per-IP rate limit (`ponytail:` per instance; move to
Postgres if abused).

| Route | Body / params | Response |
|---|---|---|
| `POST /api/cases` | `{ text?: string ≤ 20000, url?: url }` (at least one) | `201 { id }`. Text is redacted before storage. 10 per hour per IP. |
| `GET /api/cases/[id]` | n/a | `200 Case` or `404` |
| `POST /api/cases/[id]/run` | `{ image?: { mime: "image/png"\|"image/jpeg"\|"image/webp", base64 ≤ 4 MB } }` | `200 text/event-stream`. `409` if a run is active or a Dossier exists. The image is transcribed by a traced `screenshot:transcribe` call (worker model, vision), and the transcription is redacted and appended to the input. **The image is never put in graph state, the checkpointer, or the DB.** |
| `POST /api/cases/[id]/resume` | `{ answer: string ≤ 500 } \| { skip: true }` | `200 text/event-stream` continuing the thread via `Command({ resume })`. `409` if the case is not `needs_input`. |

The client holds a pending screenshot in memory (`lib/client/pending-upload.ts`) between
`/investigate` and `/case/[id]`. If the page reloads, the screenshot is gone and the run proceeds
without it.

**SSE format:** `event: <type>\ndata: <json>\n\n`. Every event has `{ seq, ts, runId }` and is a
member of the `StreamEvent` discriminated union in `lib/types/events.ts`:

| `type` | Payload |
|---|---|
| `run_started` | `{ caseId, variant }` |
| `node_started` / `node_finished` | `{ node, ms? }` |
| `tool_called` | `{ callId, node, tool, inputSummary ≤120 }` |
| `tool_result` | `{ callId, ok: true, ms, summary ≤200 }` |
| `tool_failed` | `{ callId, kind, message, willRetry }` |
| `recovery` | `{ dimension, from, to, reason }` |
| `evidence` | `{ evidence: Evidence }` |
| `finding` | `{ finding: Finding }` (provisional, before verifier) |
| `verifier_challenge` | `{ dimension, verdict, fromStatus, toStatus?, reason }` |
| `guard_violation` | `{ rule, dimension, fromStatus, toStatus }` |
| `needs_input` | `{ field, question }`, after which the stream ends |
| `dossier` | `{ dossier: Dossier }` |
| `run_finished` | `{ outcome, latencyMs, costUsdEstimate? }` |
| `error` | `{ code, message }` (user-safe), after which the stream ends |

On client disconnect, the route aborts the graph, marks the run `cancelled`, and calls
`flush()` in `finally`. Reload shows persisted state via `GET`. A rerun after cancel is allowed.
**Fixtures:** `fixtures/streams/<name>.json` holds `StreamEvent[]` recorded from real runs (at least
3: `uc1-impersonation`, `uc2-agency`, `uc4-fee`, plus `recovery`). They are used for UI development
before the backend exists, for E2E tests, and as the demo fallback.

## 10. Pages

**`/`: Landing (Antigravity).** Hero with an animated Locke mark, the line "Know who's really hiring.",
the subline "Evidence before trust.", and a CTA "Investigate a job message" → `/investigate`. A live
sample Dossier (static fixture, interactive rows). A "How Locke investigates" scroll story: Employer
→ Vacancy → Recruiter → Route → Verifier. A "What Locke will never do" strip: no trust scores, no
accusations without evidence, never contacts anyone for you, never stores your screenshot. The name
story. A pricing teaser (Free, Pro, University, API). A footer with neatHack and neatlogs, Entire,
and cfo.ai credits and the repo link. States: reduced-motion static variant.

**`/investigate`: Submit (Cursor).** A textarea ("Paste the message or job description"), a URL
field, and a screenshot drop zone with an inline notice ("Crop out personal details. Screenshots are
read once and never stored."). Three sample buttons (UC1 impersonation, UC2 agency, UC4 fee) prefill
the fields. Submit → `POST /api/cases` → navigate to `/case/[id]`. States: empty (submit disabled),
validation errors inline, submitting, rate-limited, too large, network error with retry.

**`/case/[id]`: Live investigation + Dossier (Cursor).**
- *Live view* (while running): an investigation map of the six dimensions plus the verifier (AI
  Elements `Task` / `Tool`) whose nodes move from idle to running to done. An evidence stream of
  cards with a source-type badge, host, excerpt, and tool. Recovery rows ("Careers page blocked →
  trying the ATS API"). Verifier challenge cards. An `aria-live` status line.
- *Needs input:* a question card with an answer field and a "Skip" button → `/resume`.
- *Dossier* (when done): an outcome banner (4 variants, icon + title + `outcomeReason`) and the
  headline. A **Safe Route card**: URL, why it is verified (linked evidence), caveat, and an "Open
  official page" button (`rel="noopener noreferrer"`), or an explanation of why no route was
  established. A **six-row dimension table** (dimension | status pill | one-line reason | evidence
  count → drawer with sources). Four lists: What could be verified / What could not / What is
  suspicious or inconsistent / What to do next (a checklist). A **verification email draft** with
  copy and `mailto:` buttons ("Locke never sends anything"). Missing evidence. A run footer with
  models, latency, and the neatlogs trace link when available. A disclaimer: "Locke reduces
  uncertainty; it cannot guarantee an opportunity is safe."
- States: not found, running, needs_input, done, error (show partial findings plus rerun), cancelled.

**`/evals`: Scoreboard (Cursor).** Reads `evals/results/summary.json` at build time. Metric cards
(baseline → improved, with absolute numbers like `17/25`), a before/after bar chart, a per-case
table (use case, expected vs predicted outcome, unsafe-link check, false accusation, latency, cost,
trace link), and "What changed" (fixes with commit links and neatlogs detection IDs). States: no
results yet (explanatory empty state).

**`/method`: Methodology and trust boundaries (Antigravity).** The 7 questions → 6 dimensions with
status vocabularies; the outcome rules in plain words; the source hierarchy (employer-controlled >
company database / registry > web search > recruiter-supplied, which never verifies itself); what
Locke never does; privacy; known limitations; the name story. An animated infographic of the
pipeline (reduced-motion: static diagram).

## 11. Shared components (Cursor unless noted)

`OutcomeBanner`, `StatusPill` (icon + label + tone, never color alone), `DimensionTable`,
`EvidenceCard`, `EvidenceDrawer`, `SafeRouteCard`, `VerificationDraft`, `NextSteps`,
`InvestigationMap`, `RecoveryRow`, `ChallengeCard`, `NeedsInputCard`, `MetricCard`, `BeforeAfterChart`.
Antigravity: `LockeMark` (static and animated SVG), `Wordmark`, `HowItWorks`, `TrustStrip`,
`PricingTeaser`. Tokens come from `DESIGN.md` and are implemented in `app/globals.css`.

## 12. Design direction

**Source of truth: `/DESIGN.md`** (owned by Antigravity). It defines tokens, palette, type, logo,
and motion. If it conflicts with this section, DESIGN.md wins. This section only states the product
requirements that DESIGN.md must satisfy:

- **Feel:** calm, forensic, trustworthy, like a case file on a desk. Not the generic AI look: no
  purple gradients, glass, or neon. Light theme only in V1.
- **Status tones:** DESIGN.md provides one token each for P (verified), N (neutral or uncertain), a
  caution tone (`needs_confirmation`, `inconsistent_with_practices`), and W (warning). Every tone
  must reach ≥ 4.5:1 on the page background and have a tinted background variant for pills and
  banners.
- **Type:** a readable UI face, a monospace face for URLs, domains, and evidence excerpts, and
  `tabular-nums` for metrics. Long URLs wrap with `overflow-wrap: anywhere`.
- **Logo:** works in one color at 16 px. Any reveal animation plays once and is static under reduced
  motion.
- **Product motion:** calm and short ("evidence settles"): transform and opacity only, no bounce, at
  most one spinner per screen. GSAP ScrollTrigger only on `/` and `/method`.

## 13. Accessibility

WCAG 2.2 AA. Keyboard-complete flows, a visible `:focus-visible` ring (2 px, high-contrast DESIGN.md token, with offset), and
a skip link. Landmarks and a heading order per page. All inputs labelled, with errors linked via
`aria-describedby`. The streaming status is announced in an `aria-live="polite"` region, throttled
to node-level changes (never every evidence card). Status is always conveyed by icon plus text plus
color. The dimension table is a real `<table>` on desktop and labelled description lists on mobile.
Honor `prefers-reduced-motion`. Hit targets ≥ 24 px. Charts have a text table alternative. axe
checks run in E2E.

## 14. Privacy and security

- **Redaction before tracing and storage:** `redactPii` runs in `POST /api/cases` and on screenshot
  transcriptions, so the graph, neatlogs traces, checkpoints, and DB only ever see redacted text.
  Email domains are kept because domain analysis needs them. Personal names are not removed (known
  limitation). Locke does not investigate individuals.
- **Screenshots:** read once by the vision call. Never stored or put in graph state. Their image
  content does appear in the `screenshot:transcribe` span input. Ask neatlogs whether span-input
  masking exists, and until then show the "crop personal details" notice (Risk R7).
- Secrets are server-only (`lib/env.ts`, `server-only`). No client exposure. Trace links are shared
  through the dashboard or guest links only, never through keys.
- SSRF-safe fetch (§7). Prompt-injection defense: fetched content is wrapped as untrusted, the
  verifier is an isolated model, and outcomes are deterministic.
- Cases are anonymous. Their unguessable IDs act as bearer links. No retention job in V1
  (`ponytail:`; add a 30-day TTL delete after the hackathon).
- No discriminatory signals (AGENTS.md §2.10).

## 15. Evals

**Set:** `evals/cases/*.json`, 25 labeled cases.

| Use case | Cases | Expected outcome(s) |
|---|---|---|
| UC1 fake recruiter impersonating a real company (real live posting, lookalike or unrelated apply domain, webmail or lookalike sender) | 5 | `significant_warning`, with a Safe Route to the real posting in at least 3 of them |
| UC2 legitimate staffing agency (real agency, real role) | 4 | `further_verification` or `verified_route`; **never** `significant_warning` |
| UC3 real company, nonexistent vacancy (2 with an unrelated redirect, 2 without) | 4 | redirect → `significant_warning` (because of the link, not the missing role); no redirect → `further_verification` |
| UC4 money before onboarding | 3 | `significant_warning`, `requests=suspicious_request_detected` |
| UC5 early sensitive-document request | 3 | 2 × `significant_warning` (pre-interview, unverified channel); 1 × `further_verification` (`needs_confirmation`, post-offer via the official domain) |
| UC6 conflicting terms vs the official listing | 3 | `further_verification`, `vacancy=conflicting_information` |
| Genuine controls (official-domain recruiter, real posting, official link) | 3 | `verified_route` |

**Case file:**
```json
{ "id": "uc1-02", "useCase": "uc1_impersonation",
  "input": { "text": "...", "url": "https://..." },
  "expected": { "outcome": "significant_warning",
                "dimensions": { "application_link": "lookalike_destination" },
                "safeRoute": { "status": "role_posting_confirmed", "host": "job-boards.greenhouse.io" },
                "forbiddenSafeRouteHosts": ["acme-careers-hr.com"] },
  "notes": "why this label" }
```

**Sourcing rules:** use about 8 real companies with public Greenhouse, Lever, or Ashby boards and a
currently live role. Synthetic messages use invented recruiter names. **Lookalike domains in
synthetic cases must be unregistered** (confirm with RDAP 404 when labeling). Never label a real,
registered third-party domain as bad. Re-check that the live postings still exist just before each
eval run, and relabel if they don't.

**Metrics** (`evals/score.ts`):
| Metric | Definition | Target |
|---|---|---|
| `unsafe_link_recommended` | count where the Safe Route host ∈ `forbiddenSafeRouteHosts`, or the Safe Route equals a supplied link without independent evidence | **0 (hard gate)** |
| `false_accusation_rate` | predicted `significant_warning` among cases whose expected outcome ≠ `significant_warning`, divided by the count of those cases | ≤ 1/13 |
| `outcome_accuracy` | exact outcome match / 25 | ≥ 20/25 improved |
| `dimension_accuracy` | labeled dimension statuses matched / labeled | report |
| `safe_route_found_rate` | Safe Route status matches the expected value where one is expected | report |
| `actionable_rate` | runs with a Safe Route **or** a non-empty `missingEvidence` plus a next step | 25/25 |
| `p50_latency_ms`, `avg_cost_usd`, `tool_error_rate`, `recoveries` | from runs | report |

**Protocol:** `pnpm evals --variant baseline` at the commit tagged `eval-baseline`, then fix, then
`pnpm evals --variant improved` at `eval-improved`. Use the same 25 cases, models, and temperature,
run back-to-back to limit drift, with concurrency 2. Every run is tagged in neatlogs (AGENTS.md §9).
Results go to `evals/results/<variant>.json` plus `summary.json` (with neatlogs trace URLs looked up
after the run by tag `run:<id>` via the neatlogs CLI). Report absolute counts, not only percentages.

## 16. Hackathon evidence plan (mapped to judging)

| Weight | Evidence |
|---|---|
| Agent 30% | A real end-to-end task: plan → parallel tool investigation → skeptic verifier → deterministic resolver. HITL interrupt. A visible recovery chain (fault-injected and organic). An eval set with a scorer. The architecture diagram (AGENTS.md §3). A recovery trace with a write-up in `evidence/recovery.md`. |
| Tools 25% | **neatlogs:** every run traced, and `variant:baseline`/`improved` cohorts of 25 each. Custom Detections: (1) tool error output, (2) `recovery:*` spans > 2 per run, (3) any `guard:*` span, (4) banned-language regex on resolver output. At least one **Fixes** suggestion acted on (commit links to the trace ID). Analytics before/after screenshot. CLI exports in `evidence/neatlogs/`. **Entire:** every commit checkpointed and refs pushed (`git ls-remote origin 'refs/entire/checkpoints/*'`), `entire checkpoint explain --json` for the key fix, `entire checkpoint tokens` compare, and entire-graph `checkpoint`, `diff`, and `health` in `evidence/entire/`. **cfo.ai:** a 24-month model whose cost per investigation = neatlogs `variant:improved` average cost, a "cost −50%" scenario, the shared Page link, and `docs/business-plan.md`. **Glue sentence:** "unit cost in cfo.ai = average cost per investigation measured in neatlogs." |
| Demo 20% | A 3:00 video (§17), captions on, at least 70% real footage. |
| Public 15% | At least 5 #neatHack posts tagging @neatlogs: kickoff and logo, first trace, recovery clip, before/after numbers, cfo.ai plan, final demo. The submission is a quote-tweet early in the window. |
| Original 10% | Separates employer, vacancy, recruiter, and channel; finds the legitimate route; anti-false-accusation design with a measured `false_accusation_rate`; Crustdata sponsor integration. |

## 17. Demo video beat sheet (target 2:50-3:00)

| t | Beat | On screen |
|---|---|---|
| 0:00-0:12 | Hook: "A real logo isn't proof someone is hiring." Locke mark reveal. | Landing hero |
| 0:12-0:50 | **Case A, UC1 impersonation:** paste a message from "Acme HR" with a lookalike apply link → the map lights up in parallel → evidence streams → **Significant warning indicators**, *and* the Safe Route to the real Greenhouse posting. | `/case` live view → Dossier (2-3× speed) |
| 0:50-1:15 | **Case B, UC2 agency:** "A naive checker flags this." Locke: verified agency, employer authorization unconfirmed → **Further verification required**, plus a draft email to the employer's independently found contact. | Dossier + draft |
| 1:15-1:30 | **Case C, UC4 fee:** "equipment deposit" → **Do not pay** next step is prominent. | Dossier |
| 1:30-1:55 | **Recovery:** with `LOCKE_FAULTS=crustdata:429,careers:blocked`, the UI shows a retry → fallback to search and ATS → the finding is still produced. Cut to the neatlogs trace or Session Replay with the Detection badge on the failed span. | App + neatlogs |
| 1:55-2:25 | **Improvement:** neatlogs Detection → Fixes suggestion → the fix commit's Entire checkpoint (Sessions tab) → `/evals` before/after (`x/25 → y/25` accuracy, false accusations `a → b`, unsafe links `0 → 0`). | neatlogs, entire.io, `/evals` |
| 2:25-2:45 | **Business:** cfo.ai Page: pricing tiers, cost per investigation from neatlogs, runway, "LLM cost −50%" scenario. | cfo.ai |
| 2:45-3:00 | Architecture in one frame, repo URL, #neatHack, "Evidence before trust." | slide |

Say the names of the three tools aloud while each is on screen. Cut out LLM waiting. Record a
fixture-replay take as a fallback.

## 18. Business model summary (cfo.ai input; all prices are assumptions to test)

| Tier | Price (assumed) | For |
|---|---|---|
| Free | 3 investigations per month | Adoption and utility evidence (the stated first priority) |
| Pro "Job Search Pass" | $6 per month, or $15 for 90 days | Unlimited investigations, saved history, recheck. Pass pricing fits a job search that only lasts a few months. |
| University seats | $2-4 per student per year (campus license, minimum $2k) | Career centers. Student data stays private unless authorized. |
| Platform API | $0.15-0.30 per verification | Job boards and recruitment platforms embedding checks. Needs accuracy and liability care. |

**Unit-cost inputs:** average cost per investigation = neatlogs `variant:improved` average (LLM),
plus about $0.007 × searches, plus Crustdata calls (free credits during the hackathon; list price
assumed), plus Vercel and Neon base. **Scenarios:** Main, "Price +20%", "LLM cost −50%" (cheaper
worker model or caching). The cfo.ai model is 24 months: free → paid conversion, churn, a university
pilot in month 6, and API from month 9.

## 19. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | neatlogs 1.1.21 versus the LangChain cohort (core 0.3) breaks tracing | Run the M0 trace gate first. Fall back to manual neatlogs spans, then OTLP. Never move to Python. |
| R2 | OpenRouter model lacks reliable structured output or tools, or the web plugin annotations are dropped by `ChatOpenAI` | Check it at M0 (`__includeRawResponse`). Env-swappable model slugs. Escalate a failing role only. |
| R3 | ATS discovery misses (JS careers pages, custom ATS) | Recovery chain → search → `not_independently_located` (never a warning). Eval cases chosen with public boards. |
| R4 | Live postings change between baseline and improved | Run back-to-back, re-check before each run, relabel and note it. |
| R5 | Over-eager LLM accuses legitimate recruiters | Deterministic outcome rules, guard G1-G6, isolated verifier, and the measured `false_accusation_rate`. |
| R6 | Prompt injection through fetched pages | Untrusted wrapping, bounded text, deterministic outcomes, verifier isolation. |
| R7 | Screenshot content in traces | Notice to the user; ask neatlogs about masking; screenshot is P1 and can be cut. |
| R8 | Crustdata 30 rpm limit during evals | Concurrency 2 and backoff. Search fallback. |
| R9 | Vercel duration and streaming limits | `maxDuration = 300`, budgets ≤ 150 s, persisted state with reload via GET. |
| R10 | Judges can't open neatlogs traces or Entire pages | Screenshots, CLI JSON exports, guest links. Ask on Discord. |
| R11 | Entire is not installed before the first commits | Human task H2 is the first action. The docs commit predates it, which is acceptable and noted. |
| R12 | Time | Fixtures decouple UI from backend. Strict cuts (§2). Screenshot and stretch items are first to drop. |
