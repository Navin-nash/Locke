# Locke eval cases

25 labeled cases in `evals/cases/*.json`, built to the SPEC §15 distribution. `evals/cases.test.ts`
validates the schema, the distribution, the per-use-case outcome rules, and the cross-field
consistency described below. The eval runner and scorer (T21) consume these files.

## Distribution

| Use case | `useCase` | Cases | Expected outcome |
|---|---|---|---|
| UC1 fake recruiter impersonating a real company | `uc1_impersonation` | uc1-01..05 | `significant_warning`; Safe Route to the real posting in 4 of 5 |
| UC2 legitimate staffing agency | `uc2_staffing_agency` | uc2-01..04 | 2 × `verified_route`, 2 × `further_verification` |
| UC3 real company, nonexistent vacancy | `uc3_nonexistent_vacancy` | uc3-01..04 | 01-02 (unrelated apply link) `significant_warning`; 03-04 (no link) `further_verification` |
| UC4 money before onboarding | `uc4_money_request` | uc4-01..03 | `significant_warning`, `requests=suspicious_request_detected` |
| UC5 early sensitive-document request | `uc5_sensitive_documents` | uc5-01..03 | 01-02 `significant_warning`; 03 `further_verification` (`needs_confirmation`, post-offer, official domain) |
| UC6 conflicting terms vs the official listing | `uc6_conflicting_terms` | uc6-01..03 | `further_verification`, `vacancy=conflicting_information` |
| Genuine controls | `control_genuine` | ctl-01..03 | `verified_route` |

13 cases have an expected outcome other than `significant_warning`. They form the
`false_accusation_rate` denominator (target ≤ 1/13).

## Case file

```jsonc
{
  "id": "uc1-01",                       // matches the file name
  "useCase": "uc1_impersonation",
  "input": { "text": "...", "url": "https://..." },   // url is optional (pasted job/apply URL)
  "expected": {
    "outcome": "significant_warning",
    "dimensions": { "employer": "...", "vacancy": "...", ... },   // SPEC §4 codes; see "Unlabeled dimensions"
    "safeRoute": { "status": "role_posting_confirmed", "url": "https://...", "host": "stripe.com" },
    "forbiddenSafeRouteHosts": ["stripe-careers-hr.com"],
    "flags": { "scoreUnsafeLink": true, "scoreFalseAccusation": false }
  },
  "source": { "company", "officialDomain", "board": { "provider", "slug" } | null,
              "postingId" | null, "postingUrl" | null, "checkedAt" },
  "syntheticDomains": ["stripe-careers-hr.com"],
  "notes": "why this label"
}
```

- **`expected.safeRoute.url`** is the expected Safe Route URL, or `null`. For
  `role_posting_confirmed` it is the posting URL exactly as the ATS API returns it, which is what
  `selectSafeRoute` emits (SPEC §5). For `careers_page_only` it is `null`, because both the
  official careers page and the linked ATS board root are valid. Score those on `status`.
  `boards.greenhouse.io/figma/...` redirects to `job-boards.greenhouse.io/figma/...`, so the scorer
  should treat the two Greenhouse hosts as the same.
- **`flags.scoreUnsafeLink`** is true when the case can trip `unsafe_link_recommended`, meaning it
  has forbidden hosts or the input supplies a link. Three cases (uc2-03, ctl-01, ctl-02) supply
  the real official posting. That link may become the Safe Route only because it is also found
  independently (G3).
- **`flags.scoreFalseAccusation`** is true when the expected outcome is not
  `significant_warning`. Predicting a warning on these cases counts as a false accusation.
- **`forbiddenSafeRouteHosts`** lists only synthetic, unregistered domains. Real third-party
  domains (agencies, webmail) are never labeled as bad. If an agency site is recommended as a Safe
  Route, the "equals a supplied link without independent evidence" clause catches it instead.

### Unlabeled dimensions

A dimension is labeled only when the SPEC §4 definition gives one answer. The scorer should skip
unlabeled dimensions (`dimension_accuracy` = matched / labeled). Current gaps:

- **uc1-02, uc1-04 `employer`:** the sender uses webmail or WhatsApp and only the apply link is a
  lookalike. `confirmed` and `apparent_impersonation` are both defensible.
- **uc2-04 `recruiter`:** a LinkedIn InMail from a named Michael Page consultant can reasonably be
  `verified_intermediary` (the agency is established) or `could_not_verify` (the individual is
  not tied to it). Neither is a warning.

## Real boards in use

All boards were checked through their public JSON APIs on **2026-10-10**. "Linked from official
site" is what the static HTML of the official careers page showed on that date.

| Company | Official domain | ATS | Board API | Linked from official site | Cases |
|---|---|---|---|---|---|
| Stripe | stripe.com | Greenhouse `stripe` | `boards-api.greenhouse.io/v1/boards/stripe/jobs` | posting URLs live on stripe.com | uc1-01, uc2-02, uc3-03, uc5-03 |
| Figma | figma.com | Greenhouse `figma` | `boards-api.greenhouse.io/v1/boards/figma/jobs` | yes (`figma.com/careers` → `boards.greenhouse.io/figma`) | uc1-02, uc2-04, uc3-04, ctl-01 |
| Cloudflare | cloudflare.com | Greenhouse `cloudflare` | `boards-api.greenhouse.io/v1/boards/cloudflare/jobs` | not in static HTML | uc3-01, uc5-01 |
| Discord | discord.com | Greenhouse `discord` | `boards-api.greenhouse.io/v1/boards/discord/jobs` | not in static HTML | uc3-02, uc4-02, uc5-02 |
| Palantir | palantir.com | Lever `palantir` | `api.lever.co/v0/postings/palantir?mode=json` | yes (`jobs.lever.co/palantir`) | uc1-03, uc2-03, uc6-02 |
| Notion | notion.com | Ashby `notion` | `api.ashbyhq.com/posting-api/job-board/notion` | yes (`jobs.ashbyhq.com/notion`) | uc1-04, uc2-01, uc6-03 |
| Linear | linear.app | Ashby `linear` | `api.ashbyhq.com/posting-api/job-board/linear` | yes (`jobs.ashbyhq.com/Linear`) | uc4-01, ctl-02 |
| Ramp | ramp.com | Ashby `ramp` | `api.ashbyhq.com/posting-api/job-board/ramp` | yes (`jobs.ashbyhq.com/ramp`) | uc1-05, uc4-03, uc6-01, ctl-03 |

Cloudflare and Discord boards are not linked in static HTML, so they are used only in cases where
the vacancy is expected to be `not_independently_located` (the role is absent from the board).
They are never needed as a Safe Route.

## Live postings in use (checked 2026-10-10, all HTTP 200)

| Posting ID | Company | Title | Location / terms (official) | Cases |
|---|---|---|---|---|
| 8144196 | Stripe | AI Engineer | Chicago | uc1-01 |
| 6216211004 | Figma | Brand Designer, Web | San Francisco, CA • New York, NY | uc1-02 |
| 6215865004 | Figma | Business Systems Analyst | San Francisco, CA • New York, NY | ctl-01 |
| a8174f9c-6f46-46b4-8e15-d1ff9e37c9eb | Palantir | Backend Software Engineer - Defense | Palo Alto, CA; onsite; full-time | uc1-03 |
| 6fe5515f-f677-4d98-8ac2-1775a425f5e7 | Palantir | Backend Software Engineer - Infrastructure | New York, NY; hybrid; full-time | uc2-03 |
| 1345438c-ebfc-4fa5-b545-30c1414f317c | Palantir | Backend Software Engineer - Defense | Washington, D.C.; onsite; full-time | uc6-02 |
| 3979a6f5-2abb-447b-bd3a-0565b06bae24 | Notion | Engineering Manager, Mobile AI | New York; hybrid; full-time | uc2-01 |
| 42f18ccd-c4c8-4a85-8c1f-de12c575fe87 | Notion | Software Engineer, Infrastructure | Hyderabad, India; hybrid; full-time | uc6-03 |
| f04f398b-6320-499d-8a60-290239d62da8 | Linear | Design Engineer (Web & Brand) | North America; remote; full-time | uc4-01 |
| 12f8f208-0b9c-4569-bb3d-41c8a197029e | Linear | Senior / Staff Product Engineer | North America; remote; full-time | ctl-02 |
| 4e64ab86-4e30-403b-b1b9-41dc052570ce | Ramp | Software Engineer, Frontend | New York (HQ); hybrid; $143.2K-$284K | uc1-05 |
| b9568fb8-a47e-4738-87fb-a6d88c3a505f | Ramp | Account Manager \| Commercial | New York (HQ); hybrid; $131K-$191K | uc4-03 |
| 34413f8d-26bf-4bbc-8ade-eb309a0e2245 | Ramp | Security Engineer, Cloud | New York (HQ); hybrid; $211.4K-$290.6K | uc6-01 |
| f564dcf9-9390-4a3f-896f-8047a5086040 | Ramp | Mobile Engineer, Android | New York (HQ); hybrid; $189K-$330K | ctl-03 |

**Roles that must stay absent** (title search against the board on 2026-10-10 returned nothing):
Cloudflare "Remote Payments Reconciliation Analyst", "Remote Technical Support Associate";
Discord "Community Safety Specialist", "Remote Chat Moderator", "Trust & Safety Associate";
Stripe "Payments Operations Associate", "Revenue Accounting Specialist", "Treasury Analyst";
Figma "Junior UX Researcher", "Senior Product Designer"; Notion "Remote Data Entry Specialist".

**Re-check before every eval run** (SPEC §15). If a posting is gone, relabel the case: its vacancy
becomes `not_independently_located`, its Safe Route becomes `careers_page_only`, and a control or
UC2 case moves from `verified_route` to `further_verification`. Quick check:

```sh
curl -s https://boards-api.greenhouse.io/v1/boards/stripe/jobs | grep -c 8144196
curl -s "https://api.lever.co/v0/postings/palantir?mode=json" | grep -c a8174f9c
curl -s https://api.ashbyhq.com/posting-api/job-board/ramp | grep -c 4e64ab86
```

## Synthetic domains (RDAP-confirmed unregistered)

Every lookalike or unrelated domain in a synthetic message returned **RDAP 404** from
`https://rdap.org/domain/<d>` (following the redirect to the registry) on **2026-10-10**.
Re-run before each eval run. If one becomes registered, replace it, because SPEC §15 forbids
labeling a real, registered domain as bad.

| Domain | Kind | Cases |
|---|---|---|
| `stripe-careers-hr.com` | combosquat of stripe.com (sender + link) | uc1-01 |
| `figma-talent-portal.com` | combosquat of figma.com (link) | uc1-02 |
| `palantir-recruiting.net` | combosquat of palantir.com (sender) | uc1-03 |
| `secure-hire-docs.com` | unrelated apply host | uc1-03 |
| `n0tion-careers.com` | homoglyph combosquat of notion.com (link) | uc1-04 |
| `ramp-hr-careers.com` | combosquat of ramp.com (sender + input.url) | uc1-05 |
| `careerpath-onboarding.com` | unrelated apply host | uc3-01 |
| `jobs-applyhub.net` | unrelated apply host | uc3-02 |

```sh
for d in stripe-careers-hr.com figma-talent-portal.com palantir-recruiting.net secure-hire-docs.com \
         n0tion-careers.com ramp-hr-careers.com careerpath-onboarding.com jobs-applyhub.net; do
  curl -sL -o /dev/null -w "$d %{http_code}\n" "https://rdap.org/domain/$d"; done   # expect 404
```

## Other real domains (never labeled bad)

- **Staffing agencies** (RDAP registered on 2026-10-10): randstadusa.com (2005), roberthalf.com
  (1995), teksystems.com (1997), michaelpage.com (1996). The agency link in uc2-02
  (`https://www.roberthalf.com/us/en/jobs`) returned HTTP 200.
- **Webmail senders:** gmail.com, outlook.com. Webmail makes a recruiter
  `inconsistent_with_practices` (a concern), never a warning on its own.
- **Official-domain senders** in the controls and uc5-03 enforce DMARC (2026-10-10, via DoH):
  stripe.com `p=reject`, figma.com `p=quarantine`, linear.app `p=reject`, ramp.com `p=reject`,
  palantir.com `p=reject`.

## People, phones, and handles

- **Names:** every recruiter name is invented, and no real person's name is used. Company names are
  real because the vacancies are real.
- **Phones:** only the reserved fictional range `+1 202-555-01xx`.
- **Telegram handles and email local parts** are invented. Locke never contacts anyone, and the
  synthetic domains do not resolve.

## Labeling rationale (SPEC §4-§5)

- **Missing evidence is never fraud.** A missing posting gives `not_independently_located`. A
  webmail or LinkedIn sender gives `could_not_verify` or `inconsistent_with_practices`. None of
  these can trigger R1, so uc3-03, uc3-04, and uc2-02 / uc2-04 must not be warnings.
- **UC3 warnings come from the link, not the role.** In uc3-01 and uc3-02 the apply host is
  unrelated to an established employer channel, which gives `does_not_match`.
- **The Safe Route survives warnings.** In uc1-01/02/03/05, uc4-01, and uc4-03 the vacancy is
  real, so the Safe Route points to the official posting even though the outcome is
  `significant_warning`.
- **UC6** uses a real posting with material diffs (workplace, employment type, or compensation band
  more than 20% apart). `vacancy=conflicting_information` is not `officially_confirmed`, so the
  Safe Route is the careers page only and R3 gives `further_verification`.
- **uc5-03** is an official-domain, post-offer tax-ID request: `needs_confirmation`. The role is
  already filled (absent from the board), which keeps it at R3 rather than R2.
- **The test enforces consistency.** The labeled dimensions contain an R1 trigger exactly when the
  outcome is `significant_warning`. Every `verified_route` case labels `vacancy=officially_confirmed`
  and `safe_route=role_posting_confirmed`.
