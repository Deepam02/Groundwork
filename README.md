# Groundwork

**From idea to approved.** Describe a real-world project, discover relevant public guidance, and keep a clear plan as research and correspondence change it.

Built for the Convex All Gas Hackathon. The MVP follows [vision.md](vision.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Actual progress is recorded in [hackathon.md](hackathon.md).

## Run locally

Requires Node 22.12 or newer and npm. To use an existing backend, set the public `VITE_CONVEX_URL` in ignored `.env.local`, then run `npm run dev`. This workspace's frontend is connected to the builder's existing production backend. Frontend development does not require running `convex dev` or redeploying that backend.

For a fresh checkout with a separate local fixture backend, use two terminals:

```powershell
npm ci
$env:CONVEX_AGENT_MODE = 'anonymous'
npm run dev:backend
```

Keep that terminal running. In the second terminal:

```powershell
npm run setup:local-auth
npm run dev
```

Open **http://127.0.0.1:5173**. Create a disposable account, describe a project with its location, answer the research question, and explore Plan, Timeline, and Inbox. **Add sample notice** exercises the incoming-message workflow locally.

`/` is the public marketing page, with idea shortcuts and an illustrative product preview. Signed-in visitors go to `/workspace`, where saved projects live. Starting an idea from the landing page preserves the draft through authentication and opens `/workspace/new` for review before creating the project. Project plans live at `/project/:projectId`; private links require sign-in and preserve their destination.

The database, Auth v2 sessions, workflows, and subscriptions are real local Convex. Public sources and provider responses are explicitly labeled synthetic fixtures until keys are connected. Fixture mode is refused on cloud deployments. Local fixture results do not prove that live research works in any jurisdiction.

The local authentication script works around the alpha CLI's Windows `spawnSync('npx')` issue. It refuses cloud targets, generates signing material in memory, and captures CLI output without printing secret values. Existing signing settings are preserved.

## Verification

```powershell
npm run verify
npm run test:e2e
npm run check:connections
```

`verify` runs TypeScript, ESLint, deterministic tests, and the production build. Default end-to-end tests check marketing, draft handoff, private navigation, sign-up/login/sign-out, session persistence, desktop/mobile layouts, and axe accessibility. They create a temporary account on the backend configured for the running frontend, without creating research projects or sending mail. They export no credentials, session state, or traces. Screenshots stay in ignored `.local/screenshots/`.

The full research/inbox fixture journey is opt-in. Run it only with the separate local fixture backend above, never the production deployment:

```powershell
$env:GROUNDWORK_LOCAL_E2E = 'true'
npm run test:e2e -- tests/e2e/journey.spec.ts
Remove-Item Env:GROUNDWORK_LOCAL_E2E
```

That journey additionally checks answer refinement, incoming sample notices, and cross-tab live updates.

`check:connections` reports setting names and presence only. It does **not** validate keys, call paid APIs, or prove provider availability.

To test the compiled frontend, run `npm run preview` (port 4173), then:

```powershell
$env:GROUNDWORK_TEST_BASE_URL = 'http://127.0.0.1:4173'
npm run test:e2e
```

## Connect real services

This is the final integration stage, after the builder supplies account access. Enter secrets into the selected Convex deployment's environment settings; never put them in frontend variables, public files, screenshots, or chat.

| Backend setting | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Direct OpenAI inference through Convex Agent |
| `OPENAI_MODEL` | Optional; defaults to `gpt-4.1-mini` |
| `FIRECRAWL_API_KEY` | Public web search and ordinary markdown scraping |
| `AGENTMAIL_API_KEY` | Read accepted incoming messages |
| `AGENTMAIL_INBOX_ID` | The one shared inbox; its inbox ID is its forwarding address |
| `AGENTMAIL_WEBHOOK_SECRET` | Signing secret from the webhook registration |
| `AUTH_PRIVATE_KEY`, `AUTH_JWKS` | Generate separately for the selected cloud deployment using Auth v2 setup |
| `GROUNDWORK_FIXTURES` | Must be absent or `false` on cloud |

The frontend gets only the public `VITE_CONVEX_URL`. `.env.example` documents the names; the Convex CLI creates ignored local configuration.

1. Connect the Convex account and explicitly select the intended deployment. Configure Auth v2 there. The local-only auth helper deliberately cannot initialize cloud signing keys.
2. Configure the three provider keys and select **one** AgentMail inbox.
3. Register `https://<deployment>.convex.site/webhooks/agentmail` for **`message.received`**, scoped to that inbox. Set the returned webhook signing secret in Convex. Do not register spam, blocked, or unauthenticated message events.
4. Disable fixtures, build against the intended Convex URL, and run the live verification below. Start fresh projects for live research; do not relabel local fixture projects as live results.
5. In Inbox, connect the address you forward from. Send the displayed connection subject from that address to the shared inbox. Once connected, use `[GW-<project tag>]` in forwarded subjects to choose a project. With one project the tag is optional; ambiguous mail stays in a private project picker.

Convex Auth v2 handles username/password sign-up and login. AgentMail never sends authentication mail or automatic replies. The separate incoming connection message proves control of the forwarding address, so another signed-in account cannot claim it and receive that person's future correspondence.

## Live verification before publication

After keys arrive, verify actual OpenAI extraction and Firecrawl retrieval for at least three different country/activity combinations using the same code and prompts. Inspect source passages and unresolved gaps. Confirm the available free-tier balances before rehearsals.

Test a real incoming notice, its exact date and tasks, a duplicate delivery, two forwarding users through the same inbox, and a multi-project selection. If canonical message retrieval fails, fix the connection and resend that delivery from the provider's webhook dashboard. The configuration check reports failed receipt count without exposing message data. A failed AI interpretation can be retried from the app, within its cap.

Finally test Auth v2 sign-up/login/sign-out, reload persistence, ownership isolation, and public entry/deep links on the hosted origin. Real provider behavior and public hosting remain unverified until this stage.

## Publish only when requested

The official `@convex-dev/static-hosting` component and setup are already configured. It serves the SPA alongside Auth's `/auth` component routes and the signed mail webhook. `npm run deploy` is prepared for the later, explicitly authorized publication step; it has not been run.

The final frontend must be **`https://<deployment>.convex.site`**. Confirm the production target, environment settings, public URL, asset loading, auth, and deep-link refresh before reporting it live. Do not import local auth accounts or fixture data into production.

## Structure and limits

`src/features/` groups auth, project entry, research questions, plan/evidence/timeline, and inbox UI. `convex/` owns the schema and domain transitions; `convex/integrations/` holds provider adapters and explicitly synthetic local fixtures; `convex/lib/` holds access checks, evidence validation, and shared limits. Backend tests use `convex-test` in the edge runtime; provider/domain tests and the browser story live under `tests/`.

There is no jurisdiction catalog, separate API server, crawler fleet, polling loop, or outgoing-mail agent. The same live procedure discovers authorities from each project's context. Unavailable or insufficient information stays uncertain.

The initial run and its first clarification share caps of sixteen searches, fourteen scrapes, and eight model calls. A mail follow-up stays at two of each. Requests are paced through the shared rate limiter. A failed search retries once, charged to the same budget. The 48,000-token usage gate stops subsequent calls; the last permitted call is additionally bounded by its input/output limits. Edited answers start another capped pass and count toward the daily quota. Daily limits are six runs per user and twenty per deployment; project storage is capped at ten projects per user. Incoming mail is capped at twenty messages per user per day, with at most three inference attempts per message. These controls fit a small hackathon demo; available provider balances still matter.

No OCR, attachment interpretation, account recovery, teams, or account-management platform is included. Email dates remain exactly as written; Groundwork does not invent a year, time, or time zone. Model-generated confirmations require matching excerpts from an identified official source, and completed steps are not automatically reopened by correspondence.

## Hackathon

Keep `/hackathon` current after meaningful progress. Submission requires a public source repository, root `hackathon.md`, a working public `.convex.site` URL, and a video no longer than three minutes. Use the two-minute storyboard in the implementation plan.

Deadline supplied for this project: **September 22, 12:00 PM PT**. [Submit](https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit) only when the builder requests it.
