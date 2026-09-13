import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import auth from '@convex-dev/auth/core/convex.config.js';
import password from '@convex-dev/auth/providers/password/convex.config.js';
import username from '@convex-dev/auth/username/convex.config.js';
import agent from '@convex-dev/agent/convex.config';
import workflow from '@convex-dev/workflow/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import staticHosting from '@convex-dev/static-hosting/convex.config';

const app = defineApp({
  env: {
    AUTH_PRIVATE_KEY: v.string(),
    AUTH_JWKS: v.string(),
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_MODEL: v.optional(v.string()),
    FIRECRAWL_API_KEY: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.optional(v.string()),
    AGENTMAIL_INBOX_ID: v.optional(v.string()),
    AGENTMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    GROUNDWORK_FIXTURES: v.optional(v.string()),
  },
});
app.use(auth, {
  httpPrefix: '/auth',
  env: { AUTH_PRIVATE_KEY: app.env.AUTH_PRIVATE_KEY, AUTH_JWKS: app.env.AUTH_JWKS },
});
app.use(password);
app.use(username);
app.use(agent);
app.use(workflow);
app.use(rateLimiter);
app.use(staticHosting);
export default app;
