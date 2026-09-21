# Groundwork — hackathon MVP implementation plan

Updated 2026-09-13 after the builder's scope review. [vision.md](vision.md) defines the product; the builder's latest instructions define this MVP's scope. This replaces the previous full-product roadmap. [hackathon.md](hackathon.md) records actual progress.

## 1. Product contract

**Describe a real-world project anywhere. Groundwork investigates the relevant public information, asks a useful follow-up, and produces a clear approval plan that updates when correspondence arrives.**

Global discovery is part of the MVP itself. There are no supported-city lists, jurisdiction packs, preloaded permit catalogs, locality-specific code branches, or prompts rewritten for each municipality. The same procedure handles different project types and discovers authorities and sources at runtime.

Limit research depth and supporting infrastructure to fit the hackathon. Keep geographic and project-type inputs open. Missing, inaccessible, or inconclusive public information becomes a visible gap. Global discovery does not guarantee every authority publishes usable information or that a short research pass exhausts every regulation.

The frontend is the hero. Within two minutes, a viewer should understand the problem, see Groundwork investigate, understand their next steps, and see an email change the plan. Backend decisions support that story.

The builder approved implementation, and the application is now built locally. React/Vite, Convex Auth v2, research and mail workflows, evidence validation, and the light-mode workspace are implemented. See [README.md](README.md) for local operation and the final connection procedure. Live provider validation and public deployment remain pending account access and the builder's publication request.

### Hard constraints

- Convex Free for the backend; official Convex static hosting for a .convex.site frontend. No ChatGPT Sites, alternate frontend host, or paid Convex feature.
- Direct OpenAI API with the builder's key and an inexpensive model. No Convex AI Gateway.
- Firecrawl Free, with bounded requests and shared rate limits.
- AgentMail Free: one shared application inbox for all users and projects. Route forwarded mail by the forwarding address configured on the signed-in account and then by project.
- Convex Auth v2 is a hard project requirement. Use its Username + Password provider; Convex Auth owns account creation, password handling, authentication, sessions, and sign-out.
- Implement the approved plan end to end in one continuous task. The build order below is internal sequencing, not manual phase approvals.
- Provider keys and the Convex account connection arrive at the end. Build locally with explicit provider fixtures, then finish live integration and verification after connection.
- Small, cohesive files and a clean folder structure. No speculative architecture or future-product scaffolding.

## 2. MVP scope

| Build | Extent |
|---|---|
| Conversational start | One description field; ask for missing location/type only when necessary |
| Global investigation | Discover official authorities and public pages from project context using one general procedure |
| Adaptive clarification | One short source-driven round, usually one question and at most three; allow “Not sure” |
| Living plan | Requirements appear progressively, with applicability, next action, evidence, and simple prerequisites |
| Timeline | Ordered steps and actual dated events, with “After X” where supported |
| Coverage | Compact “Checked / Still unclear” summary, expandable for sources |
| Project inbox | A project-filtered view of one shared address; forwarded mail adds tasks/dates and changes the correct user's project |
| Mail-triggered research | One bounded follow-up pass for an unfamiliar rule or condition |
| Corrections | Edit an answer, update progress, retry a failed run, confirm an ambiguous email change inline |
| Excellent frontend | Strong hierarchy, whitespace, restrained motion, legible desktop/mobile views |

Out of scope: localized rollout programs, OCR pipelines, document-language settings, translation infrastructure, user-upload document management, automatic attachment interpretation, account-management screens, teams/roles/sharing, account recovery, retention/deletion systems, background regulation monitoring, source-version diff infrastructure, vector search/RAG, agent swarms, complex critical-path optimization, alternative-prerequisite solvers, audit/analytics dashboards, and a separate judge experience.

Show email attachment names in message details without interpreting their contents. Public web pages are the primary research input. An ordinary text PDF may contribute if the same inexpensive retrieval path can extract it; documents requiring OCR or special processing remain official links and visible gaps. Do not add a document pipeline.

Do not submit applications, pay fees, book inspections with authorities, or send automatic email replies. The MVP sends no application email. AgentMail is used only to receive forwarded correspondence; it is never an AI tool or an authentication transport.

## 3. Frontend and two-minute story

### Visual direction

Use a calm editorial workspace: warm white, near-black text, muted green accents, restrained amber for uncertainty, and subtle borders. Pair a distinctive but legible display face for the opening headline with a clean sans-serif for the workspace. Keep fonts and other assets small.

Avoid a generic gradient hero, dense card grid, oversized metric tiles, glass effects, and a chat transcript dominating the product. Use tailored composition rather than accepting the default component-library look.

The public landing page (`/`) explains the use case with a project composer, quick idea starters, three process steps, and an illustrative product preview. Preserve the draft through a compact sign-up or login step, then open `/workspace/new` for review before creating a persistent project. Signed-in visitors and returning logins go to `/workspace`, which owns the saved-project list. Private deep links preserve their destination through sign-in. Forwarding-address setup lives in Inbox when needed. Each project (`/project/:projectId`) has three destinations: **Plan**, **Timeline**, and **Inbox**. Evidence opens in a side drawer, or a bottom sheet on mobile. Coverage is an expandable summary rather than a separate dashboard.

| Surface | Visible first | Details on demand |
|---|---|---|
| Start | Groundwork, “From idea to approved,” brief explanation, description field, start action | Editable examples across countries and activities; no precomputed answers |
| Research | Project/location, one current activity sentence, emerging requirements, a relevant question | Sources checked and unresolved areas |
| Plan | One next-action sentence; rows grouped into “Start here,” “Then,” and “Needs checking” | Applicability reason, authority, documents/forms, sourced fees/durations, evidence |
| Timeline | Simple ordered path and upcoming dates | Prerequisites and estimate basis |
| Inbox | Shared forwarding address, instruction to forward from the account's configured routing email, this user's project messages and “What changed” | Original text, attachment names, and a project picker for unmatched messages |

Keep each requirement row to its name, authority, one status, and next action. No model names, token usage, internal confidence scores, or research logs in product UI. Progress messages reflect actual completed/current work, with no fake thinking or percentages. Animate real changes briefly, support reduced motion, and accompany status colors with text.

### Video storyboard — target 120 seconds

| Time | Show | Story |
|---|---|---|
| 0–12 s | Opening screen | A real-world idea comes with approvals scattered across agencies |
| 12–25 s | Natural project description and location | Describe what you want to do, wherever you are |
| 25–40 s | Actual authorities, sources, and requirement rows arriving | Groundwork finds the relevant information |
| 40–53 s | One source-driven question and answer | It asks what matters as it researches |
| 53–78 s | Clear plan, evidence drawer, simple timeline | Here is your next step, why it applies, and what depends on it |
| 78–108 s | Forwarded test notice; date and preparation tasks update | Your correspondence keeps the project moving |
| 108–120 s | Brief second project from a different country/activity | Same engine, different project, no local setup |

Choose the filmed project from successful live runs after credentials arrive. This selects a story, not a specialized engine. Test at least three countries and activities using unchanged code and prompts. A second on-screen example can be honestly identified as previously researched. Editing may compress waiting; never present fixture output as a live integration result.

## 4. Architecture

| Layer | Decision |
|---|---|
| Frontend | React, TypeScript strict mode, Vite, React Router |
| UI | Tailwind CSS, shadcn/ui, Lucide, custom composition |
| Backend | Convex queries, mutations, actions, HTTP actions, reactive subscriptions |
| Conversation | @convex-dev/agent |
| Durable processing | @convex-dev/workflow for research and inbox processing |
| Inference | @ai-sdk/openai calling the OpenAI Responses API directly |
| Authentication | Convex Auth v2 alpha (`@convex-dev/auth@alpha`) with the Username + Password provider and a compact sign-up/login screen |
| Shared limits | @convex-dev/rate-limiter |
| Hosting | @convex-dev/static-hosting |
| Development | npm and one lockfile; Vitest/convex-test and Playwright |

**Yes, direct OpenAI works with Convex Agent.** The official [Agent setup](https://docs.convex.dev/agents/getting-started) uses @ai-sdk/openai as its language model provider. Use the [Responses integration](https://ai-sdk.dev/cookbook/guides/openai-responses) and a server-only API key. Pin mutually compatible package versions and test actual installed types during implementation. Coding-agent MCP tools are separate from the application's runtime integrations.

### Cheap-model default

Start with **gpt-4.1-mini**, controlled by one backend setting. It supports tools and structured outputs and has no reasoning-step latency requirement. Current listed prices are $0.40 input and $1.60 output per million tokens. An aggregate 30,000 input + 4,000 output tokens would cost about **$0.0184 in model tokens**; this is an illustrative budget, not a measured average. [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

Use that model throughout the MVP rather than building a model router. If real tests reveal important failures, compare gpt-5-mini within the agreed cheap-model scope and change the single setting. Do not silently fall back to an expensive flagship. Keep token limits, actual usage, and retries visible to development checks.

### Simple Convex Auth v2 sign-in

Use the new **Convex Auth v2 alpha** from the builder-supplied preview documentation, not the older v1 magic-link flow. Install `@convex-dev/auth@alpha`, lock the resolved preview build in the package lock, and run the v2 setup command. It creates `AUTH_PRIVATE_KEY` and `AUTH_JWKS` for the deployment and initializes `convex/auth.config.ts`, `convex/convex.config.ts`, and `convex/auth.ts`. The preview explicitly warns that APIs can change, which is acceptable for this hackathon prototype but makes exact version pinning and a final hosted sign-in test mandatory. [Convex Auth v2 getting started](https://auth-v2.previews.convex.dev/getting-started).

Choose the documented **Username + Password** provider because it needs no email delivery account, OAuth application, or device-specific passkey ceremony. Register the Auth core, password-provider, and username components. Convex Auth handles account creation, Argon2id password hashing, validation, failed-attempt rate limiting, refresh sessions, and sign-out. Keep the UI to Create account / Log in / Sign out. Password recovery, change-password settings, email verification, and account-management screens remain outside this hackathon MVP. [Convex Auth v2 password provider](https://auth-v2.previews.convex.dev/login-providers/password).

AgentMail does **not** send an authentication code or link. It is solely the inbound correspondence integration. The Inbox asks for the address the user forwards from and displays a one-hour connection subject. The user sends that subject from the claimed address to the shared inbox; only an accepted, signed incoming event with the matching sender completes the indexed, unique binding. This small correction closes the address-claim hole in the earlier plan: signing into Groundwork alone must not let a user capture someone else's future mail. Codes and routing addresses stay private, and renewal/correction is inline in Inbox. No outgoing email or authentication-mail adapter is involved.

Use `ConvexAuthProvider`, `useConvexAuth`, and the v2 password hooks. Every private query and mutation derives the user ID from `ctx.auth`; no client-supplied owner ID is trusted. Keep `convex/auth.config.ts` and the generated auth HTTP routes correct for the final `.convex.site` origin. Never log passwords, keys, session tokens, or authorization headers. Verify sign-up, returning login, refresh persistence, rate limiting, sign-out, and cross-user isolation on the actual hosted build.

### Folder structure

    src/
      app/                 routes, providers, shell
      components/ui/       shared primitives
      features/
        auth/              sign-up, login, session gate, sign-out
        marketing/         public landing page and illustrative preview
        project/           shared composer, new project, saved-project workspace
        research/          progress and questions
        plan/              requirements, evidence drawer, timeline
        inbox/             messages and change summaries
      lib/                 formatting and small UI helpers
    convex/
      schema.ts
      convex.config.ts
      auth.ts
      auth.config.ts
      users.ts             Auth user creation and forwarding-address setup
      http.ts
      projects.ts
      research.ts
      inbox.ts
      workflows.ts
      agent.ts
      integrations/        openai.ts, firecrawl.ts, agentmail.ts
      lib/                 access, validation, limits, plan ordering
    tests/
      fixtures/            synthetic source and mail responses
      domain/              plan and message behavior
      e2e/                 browser journey
    scripts/               local checks and final setup verification

No separate API server, database, realtime service, custom queue, or generic repository layer. Keep pure transformations separate from provider calls. Use Convex generated references, object-form validators, internal actions for providers, indexed project reads, and bounded collections. Register only the components used.

### Convex depth that is visible in the demo

The frontend reads and changes real Convex state throughout the story. It is not a static shell around provider calls.

| Judging signal | Concrete use in Groundwork | Visible proof |
|---|---|---|
| Queries | Auth-scoped project list, workspace snapshot, requirement details, timeline, research status, inbox and activity feed | Refreshing or opening another browser shows the same persisted state |
| Mutations | Create project, save the routing address, answer a clarification, change requirement progress, assign ambiguous mail and confirm a proposed mail change | Each action changes the shared workspace immediately and survives refresh |
| Live updates | `useQuery` subscriptions react to internal mutations made by research and mail workflows | Requirements and progress arrive while research runs; a forwarded message updates Inbox, Plan and Timeline without polling |
| Actions + HTTP actions | Server-only OpenAI and Firecrawl calls; signed AgentMail webhook and static-hosting routes | Sources come from the backend, and the mail event enters through Convex HTTP |
| Auth | Auth v2 core plus password and username components; `ctx.auth` ownership checks on every private function | Sign-up/login/sign-out work and two users cannot see or mutate each other's data |
| Components | Auth core, Auth password provider, Auth username, Agent, Workflow, Rate Limiter, and Static Hosting | Each registered component has a named job in the filmed end-to-end flow |

Keep the substantive domain transitions in Convex: research budgets, source/evidence validation, stale-revision rejection, mail deduplication/routing, ownership checks, and plan updates. The browser renders subscribed state and sends user intent; it does not hold the canonical project, run a fake timer, or persist provider output locally. Verify component registration from `convex/convex.config.ts` and verify each feature from source and a real run before claiming it in `hackathon.md`.

After the local Convex app exists, install its CLI-managed AI files and read the generated guidelines before backend work. Preserve managed sections. The builder's stack, scope, and publication instructions take precedence over plugin quickstart defaults.

## 5. Global research flow

1. **Interpret:** extract activity, location and supplied facts. Ask only if type/location is missing or genuinely ambiguous. Otherwise continue with ordinary assumptions made visible and editable.
2. **Discover:** generate two or three targeted searches. Find national/regional/local authorities and official domains from results. The model may use local-language search terms without a separate language subsystem.
3. **Read:** retrieve selected relevant official pages. Verify authority identity from context and official cross-links; a .gov suffix is not a universal rule. Search snippets alone cannot confirm an obligation.
4. **Show candidates:** extract requirements with source passages and next actions. Publish useful batches while work continues.
5. **Clarify once:** ask up to three missing-fact questions that materially change applicability, usually one. Use retrieved evidence to choose questions. “Not sure” preserves uncertainty and allows progress.
6. **Refine:** use up to two additional searches and a few extra pages to close important gaps. Deduplicate, establish simple prerequisites, and summarize remaining uncertainty.

Default total for the full initial run, including refinement: **five searches, eight ordinary page scrapes, and six model invocations**. Enforce per-call context/output limits and an aggregate token budget. Transient retries are bounded and count toward run limits. Publish only what sources support; do not force a quota of requirements.

Editing an answer increments the project revision and starts a bounded refinement using existing sources. Obsolete runs cannot overwrite newer answers. A page refresh resumes the persisted workspace rather than issuing a new run. One research pass can finish with unresolved items.

### Output and state

Each requirement contains a title, kind, authority, applicability explanation, one next action, optional forms/documents/fees/durations, simple prerequisite IDs, and bounded evidence entries linking a supported field to a source and excerpt.

Backend validation checks source references and that excerpts occur in retrieved text. Model-generated JSON is not proof that a claim is supported. Conflicts and weak support remain uncertain.

| Dimension | Values |
|---|---|
| Applicability | checking, required, not_applicable, needs_verification |
| Progress | not_started, in_progress, submitted, scheduled, done |
| Run | queued, researching, needs_answer, refining, ready, partial, failed |

A required item with authoritative support shows “Confirmed” in its details. “Not applicable” needs a source and project-based explanation, not an unsuccessful search. Unknown dates, fees and durations stay empty. Marking a task done records user progress rather than legal clearance.

The timeline is a sorted list with simple links, not a scheduling solver. Detect cycles; label suggested order separately from sourced prerequisites. Show “After X” and known date/range information. The email example in vision.md contains no time: never invent 10:30 AM. Unknown year/timezone remains unresolved when context cannot establish it.

## 6. One shared inbox, routed by forwarding sender

Use exactly **one AgentMail inbox** for the application. Every project's Inbox tab shows that shared forwarding address and only the messages routed to the signed-in user/project. This is the builder's explicit MVP override of the vision's dedicated-address wording. There is no per-project provisioning, activation, inbox allocation, or capacity-management UI.

1. Receive message.received at /webhooks/agentmail. Verify the raw-body signature, check the configured shared inbox ID, deduplicate the event/message, and coordinate durable receipt with workflow start.
2. Read the actual outer forwarding sender from canonical provider message metadata. Match it to the unique normalized routing email configured by a Convex-authenticated user. Never use the original government sender quoted inside the forwarded body, a display name, Reply-To, or a model guess to identify the account.
3. Resolve the project within that user's projects. An optional subject tag copied from the workspace can select a project. Without a tag, route automatically only when the user has one project; otherwise hold the message in that user's “Choose project” list. A foreign/invalid tag never overrides ownership. Do not guess from whichever project happens to be open in the browser.
4. After project assignment, extract preparation tasks, dates, status changes and new rule references. Apply clear additions; show uncertain changes for inline confirmation.
5. A relevant new rule triggers the same bounded engine: at most two searches, two scrapes and two model calls.

Unknown senders do not update any project and are not exposed to other users. Do not subscribe to spam/blocked/unauthenticated events. A signed webhook establishes provider delivery, not authority of every email field: require provider-accepted sender authentication and inspect its available metadata during live integration. If identity cannot be established, leave the message unapplied rather than relying on a raw From string. The routing email is a user claim in this MVP, so describe it as configured rather than verified. Forged quoted headers must have no routing effect.

Unassigned known-user mail appears as a small inbox row with a project picker, not a new dashboard. Project assignment is an owner-checked mutation; run extraction only once assignment is valid. Deduplicate across retries and assignments so a replay cannot add tasks twice.

Retain attachment names only. The research agent has no outbound mail tool. Do not subscribe to or process outgoing messages. [Webhook delivery](https://docs.agentmail.to/webhooks-overview), [signature verification](https://docs.agentmail.to/webhook-verification).

## 7. Compact data model

Use **eight application tables** plus component-owned Auth, Agent, Workflow and Rate Limiter state.

| Table | Owns | Main indexes |
|---|---|---|
| users | Application user row created by the Auth v2 provider; optional normalized routing email and setup timestamp | Unique-checked routing email |
| projects | Authenticated owner ID, description/location, current facts, revision, agent thread ID, bounded coverage summary, optional forwarding tag | Owner; owner + forwarding tag |
| researchRuns | Project, workflow ID, expected revision, trigger, state, budget/usage, current progress sentence | Project + timestamp; project + state |
| sources | Project, canonical URL, title/authority, retrieval time, bounded useful text, content hash | Project + URL hash |
| requirements | Project, stable dedupe key, content/status, bounded field evidence, prerequisite IDs, preparation tasks and dated events | Project + applicability; project + progress; project + dedupe key |
| questions | Project/run, stable fact key, question/options/reason, answer/state | Project + state; run + fact key |
| mailMessages | Authenticated owner ID, optional project ID, provider inbox/message/thread IDs, forwarding sender, routing/processing state, bounded content and proposed changes | Inbox + message ID; owner + routing state; project + received time |
| activity | Optional owner/project scope, run/message reference, operation/idempotency key, change summary, timestamp; internal webhook receipt metadata references its workflow | Project + timestamp; idempotency key |

Bound lists and source text instead of storing whole crawls or binaries. Use transactional indexed dedupe checks; indexes alone are not uniqueness constraints. Preserve a before-value for a corrected task when useful, without introducing a generalized event-sourcing/change-set system. Model output passes through internal mutations with project and revision checks. Component tables remain the authority for authentication/session state, chat history, workflow execution, and rate limits. Auth v2 calls the application's internal `createUser` mutation and uses the returned `users` ID as the authenticated subject; password credentials stay in the Auth components. The application user row stores only app data such as the configured routing email. The shared inbox ID is deployment configuration, not a per-project resource. Unassigned mail is queryable only by its identified owner; unmatched sender receipts are internal and never exposed as an inbox feed.

## 8. Free-tier operating budget

Verified against official pages on 2026-09-13. These are published allowances, not the builder's remaining balances. No paid upgrade is required by the architecture.

| Service | Published allowance | MVP response |
|---|---|---|
| Convex Free | 1M function calls/month, 20 GB-hours action compute/month, 0.5 GB database, 1 GB files, 1 GB database I/O/month, 1 GB file egress/month | Compact sources, short actions, batched progress updates, small static bundle; no polling or monitoring. Static assets share storage/egress. [Limits](https://docs.convex.dev/production/state/limits). |
| Firecrawl Free | 1,000 credits/month; basic scrape 1/page; search 2 per up-to-10 results | Five searches + eight basic HTML scrapes is about 18 credits. Reserve 25/run for retries/variance; avoid premium formats and broad crawls. [Pricing](https://www.firecrawl.dev/pricing), [search billing](https://docs.firecrawl.dev/features/search). |
| Firecrawl rates | Two concurrent browsers; search and scrape each list 10 requests/minute on Free | Shared endpoint throttles, at most two fetches, 429 backoff, one active research run at a time for this demo deployment. [Rate limits](https://docs.firecrawl.dev/rate-limits). |
| AgentMail Free | Three inboxes, 3,000 emails/month, 100/day, 3 GB storage | Use one shared inbox for forwarded correspondence only. Auth v2 sends no login email, so its allowance is reserved for the mail demo and judging. [Pricing](https://www.agentmail.to/pricing). |
| OpenAI API | Usage billing on the builder's account | One inexpensive model; bounded context/output; no paid built-in web search or embeddings |

With a fresh Firecrawl balance, allocate approximately 200 credits to live integration/cross-country testing, 200 to rehearsal/filming, and the rest to judging. Recalculate from the actual balance when connected. A 25-credit ceiling gives roughly 40 capped runs from 1,000 credits before other usage. These are budgeting calculations, not unlimited availability.

Use basic markdown and selected retrieval, not automatic scraping of every search hit. Disable expensive extraction formats. Reuse source content during clarification and repeated views, keeping retrieval dates visible. Add a small daily deployment cap and per-user run cap so casual traffic cannot immediately exhaust the account.

Throttle account-wide with the rate-limiter component. Workflow delays release action resources instead of sleeping in long actions. Record usage internally and stop at caps. A blocked page, exhausted quota or provider failure yields a partial result and retry action, never a hidden switch to invented answers. Check file/DB usage and frontend egress during the final pass; compatible features still require available quota.

## 9. Build the whole plan in one continuous pass

Once approved, execute the following without asking the builder to review each stage. Fix failing checks and continue. Ask only for required permissions, login, unavailable prerequisites, or a material choice that cannot be inferred.

| Internal order | Work | Agent verifies |
|---|---|---|
| 1. Foundation | Vite, design primitives, routes, local Convex, Auth v2 alpha core/password/username components, schema, managed AI files | Local sign-up/login/refresh/sign-out, project persistence, user isolation |
| 2. Complete UI story | Start, research progress, clarification, plan/evidence, timeline, inbox changes | Desktop/mobile screenshots and interaction checks using explicit development fixtures |
| 3. Research wiring | Agent, direct OpenAI adapter, Firecrawl adapter, bounded workflow, refinement/order | Actual backend with fixture contracts; stale-run, failed-source and unknown-answer tests |
| 4. Inbox wiring | Shared-inbox adapter, sender-to-user mapping, project routing, signed receipts, extraction, updates | Two users through one inbox; ambiguous project picker; event replay adds nothing twice |
| 5. Polish and verify | Clean structure, loading/error/empty states, keyboard/mobile, bundle size, concise copy | Typecheck, lint, tests, production build, full local browser story |
| 6. Connect accounts | Secure keys, Convex Free, one shared inbox and real webhook | Hosted Auth v2 sign-up/login, model extraction, Firecrawl evidence, routed incoming mail; fix and rerun failures |
| 7. Publish when asked | Static-hosting setup, production settings, public URL | Actual .convex.site app, assets, deep links, subscriptions and complete live flow |

### Credentials at the end

Convex supports account-free local development, so schema, generated bindings, workflow behavior and subscriptions can be tested before login. Local development does not consume Cloud quotas. Check Windows binary support and Node runtime compatibility at the start of implementation; do not fabricate bindings if a local prerequisite fails. [Local development](https://docs.convex.dev/cli/local-deployments), [agent mode](https://docs.convex.dev/cli/agent-mode).

Provider adapters use deterministic fixture responses through the same schemas and business transformations as live responses. Fixture mode is explicit, development-only and never silently enabled in the published app. Local webhook tests use signed synthetic events; a local backend is not publicly reachable by AgentMail without a tunnel, so real inbound delivery is verified once the cloud endpoint exists.

The builder supplies the three keys and connects Convex once the implementation is ready for live wiring. Obtain secrets through secure local/environment entry, not by asking for them in conversation. Prepare .env.example with names only and a verification script that reports missing settings without values.

Backend setting names: OPENAI_API_KEY, OPENAI_MODEL, FIRECRAWL_API_KEY, AGENTMAIL_API_KEY, AGENTMAIL_INBOX_ID, AGENTMAIL_WEBHOOK_SECRET, AUTH_PRIVATE_KEY, and AUTH_JWKS. Generate the Auth v2 signing settings during setup and obtain the webhook secret when registering the endpoint. Only public deployment URLs belong in frontend environment variables.

After connection, complete the account-specific work, fix provider/schema/runtime issues, and rerun the complete live flow. This final integration pass is part of delivery. Keys supplied late mean actual credentials, quotas and external responses cannot honestly be verified earlier; “one go” means continuing through those checks, not promising external services cannot fail.

Provision or select exactly one shared inbox during the final connection step. Route its production webhook to one selected deployment; local tests use fixtures rather than registering competing receivers against the same inbox. If both dev and production exist, configure each required setting explicitly in production. Build the frontend against the final backend URL. Reseed only synthetic demo data when needed; do not migrate arbitrary local records by default.

### Hosting step

After the app exists and hosting work is authorized, run:

    npm install @convex-dev/static-hosting
    npx @convex-dev/static-hosting setup

Follow the setup command's instructions. Compose auth and /webhooks/agentmail before the SPA fallback. [Official static-hosting component](https://www.convex.dev/components/static-hosting).

Publish only after the builder's later deployment request. Verify https://<deployment>.convex.site from a fresh browser: the public entry screen loads without an invitation, a judge can self-serve sign-in, deep-link refresh works, assets resolve, and the authenticated user can use the live backend. The public URL is accessible; private project data requires sign-in. Also verify webhook POST routing and auth callbacks after hosting integration.

## 10. Definition of done

1. At least three different country/activity inputs use unchanged code and prompts to discover sources. Record official links and gaps; no local permit packs.
2. Research visibly develops a plan, asks a relevant question, and changes the plan after its answer. Refresh retains state.
3. Requirement details expose supporting passages; unknown details stay unknown; simple prerequisite order is valid.
4. Two different users forward to the same inbox and each message reaches only its owner's project. A user with multiple projects can resolve an ambiguous message through the picker. The message then adds its actual date/tasks once and triggers research when relevant; no invented time.
5. Convex Auth v2 sign-up, returning login, refresh persistence, failed-attempt rate limiting and sign-out pass. Duplicate mail events are harmless; invalid signatures and unknown/untrusted senders cannot change a project. A different user cannot read/write another user's mail or state.
6. Provider calls remain within configured caps. Missing keys, limits and inaccessible sources have clear recovery states. No fixture output masquerades as live research.
7. Desktop/mobile, keyboard focus, typography, spacing, motion, empty/error states and the two-minute narrative are visually verified.
8. Typecheck, lint, relevant tests and production build pass; the actual hosted app is checked after authorized publication.

Keep testing focused on the research transformation, clarification/refinement, dates, simple ordering, webhook replay, ownership and core browser story. No compliance benchmark platform or extensive administrative tooling.

Run /hackathon after meaningful progress. Keep Event: Convex All Gas Hackathon and Frontend: Convex static hosting. Log components/models/features only when actually implemented; keep secrets, inbox addresses and private correspondence out of the public log and fixtures.

The later submission requires a public source repository, root hackathon.md, a working public .convex.site URL and a video no longer than three minutes. Aim for the two-minute story above. Deadline supplied for this project: September 22 at 12:00 PM PT. Submission: https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit.

Implementation notes: Auth v2 is pinned to `2.0.0-alpha.1` and its installed hooks return `success`, which differs from the preview examples. On Windows, the local auth helper works around the alpha wizard's `spawnSync('npx')` issue without printing signing material. Initial clarification shares the original research budget; later answer edits start a new capped pass and count toward daily run limits. A 48,000-token usage gate prevents further model calls once reached; the final permitted call is separately bounded. Mail inference has a three-attempt cap, and a failed follow-up research pass does not undo already-applied message changes. Actual indexes and fields are defined in `convex/schema.ts`.

Production publication, commits, pushes and submission remain separate actions requiring the builder's later request.
