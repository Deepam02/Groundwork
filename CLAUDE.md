# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Commands

Requires Node 22.12+. Shell examples are PowerShell.

```powershell
npm run dev            # Vite frontend on http://127.0.0.1:5173
npm run dev:backend    # convex dev (only needed for a separate local fixture backend)
npm run verify         # typecheck + lint + vitest + production build — run before claiming done
npm run typecheck      # tsc --noEmit (covers src, convex, tests, root *.ts)
npm run lint           # eslint .
npm run test           # vitest run (tests/unit/**/*.test.ts and convex/**/*.test.ts)
npm run test:e2e       # playwright (tests/e2e), serial, 1 worker, against a running frontend
npm run format         # prettier --write
npm run check:connections  # convex run checks:configuration — reports setting presence only
```

Single test runs:

```powershell
npx vitest run tests/unit/domain.test.ts -t 'partial name'
npm run test:e2e -- tests/e2e/entry-flow.spec.ts
```

`test:e2e` targets `GROUNDWORK_TEST_BASE_URL` (default `http://127.0.0.1:5173`); set it to
`http://127.0.0.1:4173` to test `npm run preview` output. Playwright does not start a server —
start `npm run dev` first.

`tests/e2e/journey.spec.ts` self-skips unless `GROUNDWORK_LOCAL_E2E=true`. It starts real research
runs and injects sample mail, so it must only ever point at a local fixture backend, never the
production deployment. `entry-flow.spec.ts` is the safe default: it only creates a throwaway account.

Local fixture backend (fresh checkout, two terminals): `$env:CONVEX_AGENT_MODE='anonymous'`
+ `npm run dev:backend`, then `npm run setup:local-auth` + `npm run dev`. `setup:local-auth`
(`scripts/setup-local-auth.mjs`) refuses cloud targets and generates Auth v2 signing material locally.

`npm run deploy` publishes via `@convex-dev/static-hosting`. Do not run it without an explicit
request — publication is a deliberate, authorized step.

## Architecture

Groundwork turns a free-text description of a real-world project ("open a café in Dublin") into a
researched approval plan, then keeps that plan current as forwarded email arrives. React/Vite SPA +
Convex backend, served in production from `https://<deployment>.convex.site` alongside Convex Auth's
`/auth` routes and the mail webhook.

### Backend (`convex/`)

Components are wired in `convex.config.ts`: Convex Auth v2 (username+password), Agent, Workflow,
Rate Limiter, Static Hosting. All deployment settings are declared in that file's `env` block and
read as the typed `env` object imported from `_generated/server` — not `process.env`.

Two durable workflows drive everything (`lib/workflow.ts`, `maxParallelism: 1`):

- **`workflows.researchFlow`** — interpret description → search → select pages → scrape → synthesize.
  Each step is a `step.runQuery/runMutation/runAction` against `research.ts` (state) and
  `inference.ts` (provider calls). A preview plan is published after two sources are read, so the UI
  fills in progressively.
- **`mailWorkflows.receive` → `mailWorkflows.process`** — fetch the message, ingest/route it, extract
  changes, and optionally start one bounded follow-up research pass (`mailResearch.start`).

Key invariants to preserve when editing backend code:

- **Revision guarding.** Every workflow step passes `{ runId, revision }`; `research.ts` mutations
  bail out or throw when `project.revision !== args.revision`. This is how a superseded run stops
  writing. New steps must carry and check the revision.
- **Budget reservation.** `research.reserve` increments per-run counters *before* the provider call
  and enforces caps (16 searches / 14 scrapes / 8 model calls; 2/2/2 for mail-triggered runs) plus a
  48,000-token gate, then returns a rate-limiter wait the workflow sleeps for. Never call a provider
  without reserving.
- **Evidence validation.** `lib/domain.ts:validateEvidence` is the trust boundary for model output:
  a requirement's applicability, fee, duration, documents, and prerequisites survive only if backed
  by an excerpt that literally appears in an *official* stored source. Unsupported fields are
  downgraded to `needs_verification`/null/empty. `validateMailChanges` does the same for email
  (dates and `certain` must appear verbatim in the message text).
- **Untrusted text.** Source pages, descriptions, and emails are data, never instructions — see the
  agent instructions in `agent.ts`. `lib/domain.ts:publicUrl` rejects non-https, credentialed,
  ported, IP-literal, and internal hostnames before anything is fetched.
- **Ownership.** All user-facing queries/mutations go through `lib/access.ts` (`requireUser`,
  `requireProject`). Auth v2's identity `subject` is the `users` row ID.
- **Error text.** Provider errors are never persisted verbatim (they can carry request data and
  headers); workflows catch and store a fixed user-facing message.

`integrations/` holds the provider adapters (`firecrawl.ts`, `agentmail.ts`, shared `http.ts`),
their Zod response contracts (`contracts.ts` — these also define the structured-output schemas for
OpenAI), and `fixtures.ts`. `lib/mode.ts:fixturesEnabled()` gates fixtures to a localhost
`CONVEX_SITE_URL` and **throws** if `GROUNDWORK_FIXTURES=true` on a cloud deployment.

Mail routing (`mailData.ts:ingest`): a `GW-CONNECT-<32 hex>` subject proves control of a forwarding
address and claims it for the signed-in user; otherwise the sender is matched to `users.routingEmail`,
and the project is chosen by a `[GW-<8 hex tag>]` subject tag (optional when the user has exactly one
project; ambiguous mail lands in `unassigned` for a manual picker). One shared AgentMail inbox serves
all users. The webhook (`http.ts`) verifies the signature, rejects oversized bodies, and only accepts
`message.received` for the configured inbox.

Rate limits live in one place, `lib/limits.ts` (6 runs/user/day, 20/deployment/day, 20 mails/user/day,
5 connect attempts/hour, Firecrawl token bucket).

### Frontend (`src/`)

`main.tsx` mounts `ConvexAuthProvider` + `BrowserRouter` and renders a connection screen when
`VITE_CONVEX_URL` is absent. `app/app.tsx` owns routing and the auth dialog: `/` is public marketing,
`/workspace`, `/workspace/new`, and `/project/:projectId` are private and wrapped by `privatePage()`,
which shows a sign-in prompt carrying the intended destination so deep links survive authentication.
A landing-page draft is preserved through sign-up and reviewed at `/workspace/new` before
`projects.create` runs (`requestId` makes creation idempotent).

`features/` is grouped by surface: `marketing`, `project` (composer, workspace home), `plan`
(workspace with Plan/Timeline/Inbox, evidence drawer), `research` (question card), `inbox`, `auth`.
Styling is Tailwind v4 (`@import 'tailwindcss'` in `src/styles.css`) plus CSS custom properties for
the editorial palette and a few per-feature `.css` files for bespoke layouts. `components/ui/` holds
the only two shared primitives (button, dialog) — keep it that way rather than growing a component
library. The visual direction (calm editorial, no gradient hero / metric-tile grid / glass) is
specified in `IMPLEMENTATION_PLAN.md` §3.

### Tests

`convex/backend.test.ts` uses `convex-test` with `import.meta.glob('./**/*.ts')` and
`rateLimiter.register(t)`, running in the `edge-runtime` environment. `tests/unit/` covers pure
domain logic (`domain.test.ts`) and provider adapters against documented response shapes with a
stubbed `fetch` (`providers.test.ts`). E2E specs assert on accessible roles/labels and run axe
(`wcag2a`, `wcag2aa`) with an empty-violations expectation; screenshots go to ignored
`.local/screenshots/`.

## Conventions

- Convex functions use the object form with explicit `args` **and** `returns` validators; `schema`
  is imported and `schema.doc('table')` used for document return types.
- Public vs internal is load-bearing: anything a workflow or webhook calls is `internal*`.
- Small, cohesive files; no speculative abstraction or future-product scaffolding.
- Secrets go only into Convex deployment settings. The frontend receives exactly one public value,
  `VITE_CONVEX_URL`. Never add a `VITE_`-prefixed provider key.
- User-facing copy is plain-language and non-alarming; uncertainty stays explicit rather than being
  smoothed over ("Still unclear" gaps, `needs_verification`).

## Project docs

`vision.md` (product), `IMPLEMENTATION_PLAN.md` (MVP scope, hard constraints, two-minute demo
storyboard), `README.md` (local operation, the live-connection procedure, and the limits this demo
deliberately accepts), `hackathon.md` (actual progress — keep current after meaningful work).
Live provider behavior and public hosting are unverified until the connection steps in `README.md`
are completed; do not describe fixture results as live results.
