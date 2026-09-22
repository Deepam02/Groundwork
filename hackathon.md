# Hackathon log

- **Project:** Groundwork
- **Event:** Convex All Gas Hackathon
- **What it does:** Investigates project-specific approvals and maintains a source-backed plan as research, answers, and correspondence change.
- **Live app:** https://steady-chipmunk-476.convex.site
- **Repo:** https://github.com/Deepam02/Groundwork
- **Frontend:** Convex static hosting
- **Convex deployment:** https://steady-chipmunk-476.convex.cloud
- **Components:** @convex-dev/auth, @convex-dev/agent, @convex-dev/workflow, @convex-dev/rate-limiter, @convex-dev/static-hosting
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP actions, realtime queries, durable workflows, file storage, scheduled functions
- **Auth:** Convex Auth
- **AI models:** gpt-4.1-mini (default in `convex/agent.ts`, overridable per deployment via `OPENAI_MODEL`; reached through the direct OpenAI API)
- **Started:** 2026-09-13T07:47:38Z
- **Last updated:** 2026-09-22T16:30:00Z

## Log

### 2026-09-13
Started environment setup in an empty workspace with no Git history or application source.
Installed and read the hackathon skill (`.agents/skills/convex-hackathon-skill/SKILL.md`
and `references/log-format.md` inside that skill folder); selected Convex static hosting for the later build.
Verified the official Convex plugin version 1.10.0 is installed and enabled, with its skills and MCP configuration present; after restart, all 19 Convex skills, the hackathon skill, and both MCP servers are available in the agent session.
No application or hosting component has been initialized. Started time uses the downloaded skill files' local modification time as weaker evidence of setup, not prior product development.
The Convex MCP status check responded with an authorization requirement for project access. Login and deployment access remain deferred until later application setup, as required by the official environment-setup instructions.

### 2026-09-13
Read the product vision as the source of truth (`vision.md`).
Created the full product implementation plan (`IMPLEMENTATION_PLAN.md`) covering architecture, adaptive research, evidence and applicability, the data model, inbox processing, integrations, phased delivery, and verification gates.
The plan records proposed implementation decisions; no application code or runtime integrations were built in this step.

### 2026-09-13
Revised `IMPLEMENTATION_PLAN.md` around the builder-approved global hackathon MVP scope, with direct inexpensive OpenAI inference, Convex and Firecrawl free-tier budgets, and the accepted AgentMail inbox limit.
Replaced the full-product roadmap with a frontend-led two-minute story, seven application tables, a short research/clarification loop, and continuous end-to-end implementation with live credentials connected at the end.
Removed locality-specific delivery scope and deferred OCR, account management, retention, advanced scheduling, and other nonessential systems. This is a plan revision; no application features were built.

### 2026-09-13
Updated `IMPLEMENTATION_PLAN.md` to use one shared AgentMail inbox, superseding the earlier multi-inbox allocation. Forwarded messages route by verified account identity and then project, with a project picker when needed.
Made Convex Auth sign-in a hard project requirement and specified magic links. Convex Auth manages authentication; AgentMail is the email delivery adapter, reusing the shared inbox.
Updated the data model, build order, and verification cases for the revised design. Authentication and mail integrations remain planned, not implemented.

### 2026-09-13
Corrected the authentication plan to use the hackathon's Convex Auth v2 alpha preview with its Username + Password provider. The planned Auth core, password, and username components own credentials, sessions, validation, and rate limiting; AgentMail is now reserved for incoming project correspondence.
Added a concrete Convex-depth contract covering authenticated queries, mutations, live subscriptions, actions, HTTP actions, and the Agent, Workflow, Rate Limiter, Auth, and Static Hosting components. These remain planned features; no application code or runtime integration exists yet.

### 2026-09-13
Built the light-mode React/Vite workspace with project entry, adaptive questions, evidence drawers, requirement progress, timeline, coverage, and a shared-inbox view (`src/features/`). Implemented Auth v2 core/password/username components, owned project queries and mutations, bounded research and mail workflows, source validation, request limits, and static-hosting routes (`convex/convex.config.ts`, `convex/research.ts`, `convex/workflows.ts`, `convex/mailData.ts`, `convex/http.ts`). Forwarding-address binding requires a matching incoming connection message; AgentMail sends no authentication email.

Verified local account creation, login, wrong-password recovery, reload persistence, answer refinement and edits, recorded progress, duplicate sample notices, correspondence dates/tasks, and live updates across two browser tabs. TypeScript, ESLint, 22 deterministic domain/provider/backend tests, and the production build passed. The complete Playwright journey also passed against the compiled frontend, with desktop/mobile screenshots and zero detected WCAG A/AA violations on the checked landing and plan views. Evidence is from current source and command runs, without Git history.

Provider responses remain explicitly labeled local fixtures. Real OpenAI inference, Firecrawl discovery across countries, AgentMail webhook delivery, cloud authentication, and public hosting are pending credentials and final live verification. Added a setting-presence check that returns no secret values and documented the connection procedure in `README.md`. No cloud publication, commit, push, or submission was performed.

### 2026-09-14 - 149da65
Replaced the single start screen with a public marketing landing page, a shared project composer, and a workspace home that lists saved projects. Routes are now `/`, `/workspace`, `/workspace/new`, and `/project/:projectId`; a landing-page draft survives sign-up and is reviewed before the project is created (`src/app/app.tsx`, `src/features/marketing/`, `src/features/project/`). Added Playwright coverage for marketing entry, draft handoff, and workspace navigation (`tests/e2e/entry-flow.spec.ts`), with axe checks on the landing and workspace views.

### 2026-09-21 - working tree
Made official-source citation a rule enforced in code rather than a prompt preference. Research now runs two passes: discovery searches find the responsible authority, then evidence searches run only inside the hostnames those results actually returned. Blogs, consultants, and directories can inform the query vocabulary but are dropped before anything is read or cited (`convex/workflows.ts`, `convex/inference.ts`).
Added `includeDomains`/`excludeDomains`/`limit` to the Firecrawl adapter, normalized to bare hostnames, with the two filters never sent together and discovery widened from 5 to 10 results (`convex/integrations/firecrawl.ts`). Authority hostnames proposed by the model are intersected with the hosts discovery returned, so an invented domain cannot widen the evidence set, and selected pages pass an `official` gate before the scrape loop (`convex/lib/domain.ts`).
A run with no identifiable authority, or no confirmable official page, now ends with an explicit coverage gap instead of falling back to unofficial pages. Mail-triggered follow-ups previously read their top two search hits with `official` hardcoded to false; they go through the same gate now. Queries use jurisdiction and document words (permit, licence, registration, notification, circular, form, fee) and avoid explainer phrasing; official PDFs are selectable as primary sources, though OCR for scanned documents is still out of scope.
Also fixed a redirect race that could drop the landing-page draft after sign-up, and refreshed `README.md`, `IMPLEMENTATION_PLAN.md`, and `CLAUDE.md` for the new routes and the opt-in fixture journey.
Verification is `npm run verify` on this checkout: TypeScript, ESLint, 25 deterministic tests, and the production build. New tests cover domain-filter emission, exclusive filters, exact-host reuse, and unofficial pages being dropped before scraping. These are deterministic tests against documented response shapes, not live Firecrawl runs; the ranking improvement itself is unverified until keys are connected.

### 2026-09-21 - working tree
Published the app to the production deployment `steady-chipmunk-476` with `npm run deploy`: the frontend is built against the prod Convex URL, backend functions are pushed, and the static bundle is served from Convex static hosting at https://steady-chipmunk-476.convex.site. No index was deleted and the schema was unchanged, so no migration ran. The `/auth/.well-known/jwks.json` route and the site root both answer 200.
Provider settings (OpenAI, Firecrawl, AgentMail) and the Auth v2 signing material were already configured on that deployment; the deploy did not read or change them. The first attempt failed because `convex deploy` typechecks with `convex/tsconfig.json`, which lacked Node types for the `process.env.CONVEX_SITE_URL` read in `convex/auth.config.ts`; adding `"types": ["node"]` there fixed it without changing any runtime behavior.
Live behavior is still unverified: no research run, mail delivery, or account creation has been exercised against this deployment, so the official-source search path remains untested outside deterministic tests.

### 2026-09-22 - working tree
Replaced the government-first discovery pass with a staged investigation. A run asks for a missing city or activity before any search, reads local accounts to name the steps, publishes those steps immediately as checking, asks one branching question, then confirms each authority on an official page. Local accounts are leads: a step is confirmed only when an excerpt appears in an official source. Initial-run caps are 12 searches, 12 scrapes, and 8 model calls; a mail follow-up stays at 2 of each. Hitting the search or scrape cap stops that loop and keeps the rows already saved (`convex/workflows.ts`, `convex/inference.ts`, `convex/research.ts`, `convex/lib/domain.ts`, `src/features/plan/workspace.tsx`).
Verification is `npm run verify` on this checkout: TypeScript, ESLint, 31 deterministic tests, and the production build. Tests cover unofficial pages not confirming a step, checking rows published before an official source exists, resuming past a finished map, and the search cap leaving existing rows in place. This is not a live Firecrawl run.

### 2026-09-22 - working tree
A checklist step is now a specific filing document. Each lead is searched on its own for the application form, filing page, notification, circular, or PDF. A department homepage is not accepted as the citation. When that document is not found, a not-started step is removed from the finished checklist and recorded as a gap. The evidence link is labeled for the document and shows its URL. Initial-run caps are 16 searches, 14 scrapes, and 8 model calls; a mail follow-up stays at 2 of each (`convex/workflows.ts`, `convex/inference.ts`, `convex/research.ts`, `convex/lib/domain.ts`, `src/features/plan/workspace.tsx`, `src/features/plan/evidence-drawer.tsx`).
Verification is `npm run verify` on this checkout: TypeScript, ESLint, 33 deterministic tests, and the production build. Tests cover PDF-over-homepage ranking, one form per fixture step, retiring a step with no document, and an unofficial page leaving a step unchecked. This is not a live Firecrawl run. The saved café plan on the production deployment is unchanged until this code is deployed and that project is researched again.

### 2026-09-22 - c0cbcf0
Rebuilt the project page around the research itself. Every decision a run makes is now persisted to a `researchEvents` table and streamed to the page as it happens: the literal search queries, each candidate with its host, and the reason anything was turned down — "Consultant site, not the authority", "Department home page, not the application", "Forum or publisher, not an authority". The page is one two-pane shell throughout: a left rail of confirmed steps beside a right pane that shows the live trail during a run, a clarifying question when one is asked, and the selected step's detail afterward. The evidence drawer and the separate timeline view are gone; mail-derived dates render on the steps themselves and the inbox moved behind a header button (`convex/trail.ts`, `convex/schema.ts`, `src/features/plan/research-trail.tsx`, `step-rail.tsx`, `step-detail.tsx`, `overview.tsx`, `workspace.tsx`).

Steps no longer appear and then vanish. `requirements.stage` records `lead`, `confirmed`, or `dismissed`; a lead that no official page confirms is patched to `dismissed` with its gap explanation instead of being deleted, and the rail shows it under a "couldn't confirm" group (`convex/research.ts`, `convex/lib/validators.ts`).

Source ranking was inverted to prefer somewhere to apply over something to read. `convex/lib/sources.ts` classifies a page as `apply`, `form`, `notice`, `guidance`, or `lead` and scores an online application or service page above a form PDF above a circular; the first search pass looks for the application and only the retry falls back to `filetype:pdf`. A confirmed step carries an `applyUrl` validated against the stored official sources like every other field. PDFs that do get cited are fetched into Convex file storage under an 8 MB cap and served inline from a `/document` HTTP route, so they embed in the page instead of sending anyone to a site that refuses framing (`convex/documents.ts`, `convex/http.ts`, `src/features/plan/document-viewer.tsx`).

The confirm phase now gates on authority before anything is read: all search candidates go to one `pickOfficial` call, and only what survives is scraped. Scraped markdown is trimmed of site navigation before storage, so skip links and quick-link menus never reach the model or get quoted back as evidence. A step query that arrives as a bare URL falls back to the step's own words. Pacing went to a Firecrawl token bucket of 10/min with a burst of 5 and `maxParallelism: 3`, with per-step lookups batched through `Promise.all`; the provider budget is unchanged at 16 searches / 14 scrapes / 8 model calls (`convex/workflows.ts`, `convex/inference.ts`, `convex/lib/limits.ts`, `convex/lib/workflow.ts`).

Verification is `npm run verify` on this checkout: TypeScript, ESLint, 37 deterministic tests, and the production build. Unlike earlier entries this was also exercised live against the dev deployment across three runs, which is how the officiality gate, the chrome trimming, the URL-as-query fallback, and a look-alike `.com` domain being accepted for a named public body were each found and fixed. Production still runs the previously deployed code; nothing here is live at https://steady-chipmunk-476.convex.site until it is deployed.
