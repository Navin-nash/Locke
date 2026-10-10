# Locke: neatHack build log

## Project
- **Name:** Locke
- **Purpose:** An investigator agent that independently verifies who is really behind a job
  opportunity (employer, vacancy, recruiter, and application channel) and hands back an
  evidence-backed Dossier plus a verified route to apply. *Evidence before trust.*
- **Problem:** Recruitment impersonation and fee and data scams hurt job seekers, while overly
  aggressive scam detectors scare people away from real jobs. A real logo or job description doesn't
  prove the sender is authorized to recruit. Locke separates what can be verified from what can't,
  and never treats missing evidence as fraud.

## Team
- Navin-nash (GitHub)

## Stack
Planned; nothing below is running yet.
- Next.js 16 App Router (TypeScript, Node runtime), pnpm, deployed on Vercel
- LangGraph.js agent: intake (HITL) → planner → parallel investigators → skeptic verifier →
  deterministic guard and resolver
- OpenRouter for every LLM call via `@langchain/openai` `ChatOpenAI`: planner `openai/gpt-5.6-sol`,
  worker `openai/gpt-5.6-luna`, verifier `google/gemini-3.8-flash`. Web search through the
  OpenRouter web plugin.
- **neatlogs** TS SDK (`neatlogs` + `neatlogs/langchain` handler) traces every run, with
  baseline/improved cohorts, Detections, and Fixes
- **Entire** checkpoints every coding-agent session (Claude Code, Codex, Cursor, Antigravity), plus
  entire-graph evidence
- **cfo.ai** business plan using the real per-investigation cost measured in neatlogs
- **Crustdata** (sponsor) company identity API; public ATS APIs (Greenhouse, Lever, Ashby,
  SmartRecruiters, Workable); RDAP; DNS-over-HTTPS
- Neon Postgres (cases + LangGraph PostgresSaver); shadcn/ui, AI Elements, Tailwind, Motion, and GSAP

## Build log

### 2026-10-10 (Sat): foundation docs
**Completed**
- Wrote the canonical docs every coding agent follows: `AGENTS.md` (rules, invariants, architecture,
  ownership, dispatch policy for 4 harnesses), `CLAUDE.md` (Claude Code skill map), `docs/SPEC.md`
  (full product spec: 6 Dossier dimensions with exact status vocabularies, 4 outcomes with
  deterministic decision rules, tool contracts, data model, SSE protocol, pages, design, evals, demo
  beats, business model, risks), `docs/PLAN.md` (time-boxed plan: M0-M5, 28 tasks spread across
  Claude Code, Codex, Cursor, and Antigravity, plus human tasks), and `.env.example`.
- Decisions:
  - The overall outcome is a pure function, not an LLM judgment.
  - The verifier can only downgrade.
  - A recruiter-supplied link can never be the Safe Route without independent evidence. The eval
    metric `unsafe_link_recommended` must be 0.
  - No numeric trust score.
  - The first technical gate is one persisted, correctly nested neatlogs trace.
- Pinned the LangChain 0.3 cohort for neatlogs 1.1.21 compatibility. Postgres checkpointer pinned to
  0.1.3, the last line that peers on core <0.4 (checked against the npm registry).

**Not yet done / notes**
- Entire CLI was **not installed** on the build machine when this docs commit was made, so this
  commit has no checkpoint. Installing Entire is human task H2, before the scaffold lands.
- No code, tests, traces, or evals exist yet. Next: M0 (scaffold + neatlogs trace gate).

**Evidence:** none yet (docs only).

## Demo
Pending. The URL and instructions will be added once the Vercel preview runs end-to-end (Gate 3 in
`docs/PLAN.md`).

## Known limitations and next steps
- Planned limitations for V1: no accounts; no multi-message case threads; Locke never sends email;
  personal names are not redacted (only contact details, IDs, and financial numbers are); screenshot
  content is visible in the transcription trace span.
- Next steps: see `docs/PLAN.md`, starting with M0.

## Submission
- **Confirmed requirements** (from neatlogs.com/hackathon): use neatlogs, Entire, and cfo.ai;
  include the business plan; a demo video; building in public with #neatHack; submit by
  quote-tweeting the official neatlogs post, Oct 12 2026, 7:00-11:55 PM IST.
- **Outstanding:** everything: working app, public repo check, video, cfo.ai Page link, evidence,
  posts, and the quote-tweet.
