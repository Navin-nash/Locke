@AGENTS.md

# Claude Code specifics

Everything in AGENTS.md applies. This file only maps Claude Code **skills to moments**: invoke the
skill when the trigger happens, not out of habit. If a skill's advice conflicts with AGENTS.md or
`docs/SPEC.md`, the repo docs win.

Before starting a task, read your task block in `docs/PLAN.md` and the SPEC sections it cites.

## Process (every task)

| When | Skill |
|---|---|
| A task is ambiguous, or a new behavior isn't specified in SPEC | `superpowers:brainstorming` (keep it short; the SPEC answers most questions) |
| Turning a PLAN task into steps before touching code | `superpowers:writing-plans` |
| Plan touches the graph, state, or a contract in `lib/types` | `plan-eng-review` |
| Plan touches a page layout or visual system | `plan-design-review` |
| Fuzzy product question (scope, positioning, cut or keep) | `office-hours` |
| Large multi-part task where a full plan → review pipeline is worth it | `autoplan` |
| Writing any deterministic function (tools, outcome rules, guard) | `superpowers:test-driven-development` |
| Executing a plan with independent sub-steps in one session | `superpowers:subagent-driven-development` (AO workers: don't spawn subagents; ask the orchestrator for more workers) |
| A test, build, or trace fails unexpectedly | `superpowers:systematic-debugging`; find the root cause before patching |
| About to say "done", open a PR, or update `hackathon.md` | `superpowers:verification-before-completion`; show the command output |
| Self-review of a diff before the PR | `review` |
| Clicking through the running app after a UI-affecting change | `qa` |
| Final ship of a branch (tests, PR body) | `ship` (local commit only unless publishing is authorized) |
| Always on | `ponytail`: smallest working diff, no speculative scope, `ponytail:` comments on known ceilings |

## Research (verify before building on an assumption)

| When | Skill |
|---|---|
| Library or API usage (LangGraph.js, @langchain/openai, Next 16, shadcn) | `context7` / `docs-lookup` first |
| A specific page to read (ATS API docs, Crustdata reference, RDAP) | `firecrawl` (scrape) |
| Quick fact or "does X exist" check | native web search |
| Behavior is unclear or a bug was reported upstream | `firecrawl-developer-index` |
| Broad discovery, such as example impersonation domains or real ATS boards for eval cases | `exa-search` |
| A multi-source written report is needed (rare in this build) | `deep-research` / `firecrawl-deep-research` |

## Agent and LangGraph work (Claude Code owns `lib/agent/**`)

| When | Skill |
|---|---|
| Building or changing nodes, edges, `Send` fan-out, reducers, `config.writer` streaming | `langgraph-fundamentals` |
| Intake follow-up question (`interrupt()` / `Command({ resume })`) | `langgraph-human-in-the-loop`. Keep side effects after the interrupt, because nodes replay on resume |
| MemorySaver → PostgresSaver, thread IDs, `.setup()` | `langgraph-persistence` |
| Anything touching neatlogs init, handler, tags, flush, or the M0 trace gate | `neatlogs-ts` (install: `npx skills add neatlogs/skills --skill "neatlogs-ts"`) |
| Writing or revising prompts (planner, verifier, resolver) | `prompt-engineering-patterns`; bump `PROMPT_VERSION` and run evals |
| Designing eval cases or scoring | `eval-harness` |

## UI work (Cursor owns product UI, Antigravity owns brand and motion; use these when Claude Code reviews or pairs on UI)

Read `DESIGN.md` before any UI task. It is the source of truth for tokens, palette, type, and motion.

| When | Skill |
|---|---|
| Adding or composing components, presets, `components.json` | `shadcn` |
| Agent-run visuals: task lists, tool calls, sources, loaders | `ai-elements` |
| Overall design direction, critique, or hardening a screen | `impeccable` |
| Reading `DESIGN.md` or proposing a token change (Antigravity owns the file; route changes through the orchestrator) | `design-md` |
| Landing or marketing composition that must not look generic | `design-taste-frontend` |
| Polishing details (radius, depth, hit areas) | `better-ui`, `emil-design-eng` |
| Full polish pass across a page | `better-interface` (runs layout, typography, colors, accessibility, writing) |
| Spacing, grouping, reading order of the Dossier | `better-layout` |
| Type scale, numerals, wrapping of long URLs | `better-typography` |
| Palette, status colors, contrast checks | `better-colors` |
| Keyboard, focus, ARIA live regions, screen-reader labels | `better-accessibility` |
| Microcopy: statuses, next steps, empty and error states | `better-writing` |
| Eval charts on `/evals`, before/after visuals | `dataviz`, `chart-animation` |
| Any animation decision | `animation-principles` first, then `60fps-animation` and `accessible-animation` |
| React motion on product pages (evidence stagger, status settle) | `motion-web`, `micro-interaction` |
| Route transitions between `/investigate` → `/case/[id]` | `page-transition-animation` |
| Landing and `/method` scroll stories | `gsap-core`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils`, `gsap-plugins`, `gsap-frameworks`, `gsap-web`, `gsap-performance` |
| Subtle animated backgrounds (landing only, reduced-motion aware) | `motion-background` |
| Pricing section (Free / Pro / University / API) | `motion-pricing` |
| "How it works" infographic on `/method` | `animated-infographic` |
| Logo and SVG motion | `logo-design`, `logo-animation`, `svg-animation` |
| Motion language doc for the brand | `brand-motion-guidelines` |
| Demo-video motion polish (title cards, captions) | `after-effects` |

## Claude Code habits in this repo

- Write `lib/types` first. Write a recorded fixture before asking Cursor to build against a stream.
- For any prompt change, run `pnpm evals --variant improved --cases <subset>` and paste the delta
  into the PR.
- After the M0 gate, check every new node in neatlogs once (`neatlogs traces get <id> --json`).
- Keep `hackathon.md` current at the end of each work session. Record only results that actually
  ran; label planned work as planned.
- Commit small and often. Don't push or open a PR unless the task or the orchestrator authorizes it.
