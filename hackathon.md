# Hackathon log

- **Project:** Groundwork
- **Event:** Convex All Gas Hackathon
- **What it does:** Investigates project-specific approvals and maintains a source-backed plan as research, answers, and correspondence change.
- **Live app:** not deployed
- **Repo:** none
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/auth, @convex-dev/agent, @convex-dev/workflow, @convex-dev/rate-limiter, @convex-dev/static-hosting
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP actions, realtime queries, durable workflows
- **Auth:** Convex Auth
- **AI models:** gpt-4.1-mini (configured through the direct OpenAI API; live inference pending credentials)
- **Started:** 2026-09-13T07:47:38Z
- **Last updated:** 2026-09-13T14:47:57Z

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
