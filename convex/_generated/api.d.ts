/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as checks from "../checks.js";
import type * as development from "../development.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as inference from "../inference.js";
import type * as integrations_agentmail from "../integrations/agentmail.js";
import type * as integrations_contracts from "../integrations/contracts.js";
import type * as integrations_firecrawl from "../integrations/firecrawl.js";
import type * as integrations_fixtures from "../integrations/fixtures.js";
import type * as integrations_http from "../integrations/http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_mode from "../lib/mode.js";
import type * as lib_runs from "../lib/runs.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_workflow from "../lib/workflow.js";
import type * as mailActions from "../mailActions.js";
import type * as mailData from "../mailData.js";
import type * as mailResearch from "../mailResearch.js";
import type * as mailWorkflows from "../mailWorkflows.js";
import type * as projects from "../projects.js";
import type * as research from "../research.js";
import type * as users from "../users.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  auth: typeof auth;
  checks: typeof checks;
  development: typeof development;
  http: typeof http;
  inbox: typeof inbox;
  inference: typeof inference;
  "integrations/agentmail": typeof integrations_agentmail;
  "integrations/contracts": typeof integrations_contracts;
  "integrations/firecrawl": typeof integrations_firecrawl;
  "integrations/fixtures": typeof integrations_fixtures;
  "integrations/http": typeof integrations_http;
  "lib/access": typeof lib_access;
  "lib/domain": typeof lib_domain;
  "lib/limits": typeof lib_limits;
  "lib/mode": typeof lib_mode;
  "lib/runs": typeof lib_runs;
  "lib/validators": typeof lib_validators;
  "lib/workflow": typeof lib_workflow;
  mailActions: typeof mailActions;
  mailData: typeof mailData;
  mailResearch: typeof mailResearch;
  mailWorkflows: typeof mailWorkflows;
  projects: typeof projects;
  research: typeof research;
  users: typeof users;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/core/_generated/component.js").ComponentApi<"auth">;
  authPasswordProvider: import("@convex-dev/auth/providers/password/_generated/component.js").ComponentApi<"authPasswordProvider">;
  authUsername: import("@convex-dev/auth/username/_generated/component.js").ComponentApi<"authUsername">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
