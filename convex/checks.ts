import { internalQuery, env } from './_generated/server';
import { v } from 'convex/values';

/** Returns presence only; no secret values and no provider calls. */
export const configuration = internalQuery({
  args: {},
  returns: v.object({
    mode: v.string(),
    settings: v.array(v.object({ name: v.string(), configured: v.boolean() })),
    failedMailReceipts: v.number(),
  }),
  handler: async (ctx) => ({
    mode:
      env.GROUNDWORK_FIXTURES === 'true'
        ? 'local fixtures (provider calls disabled)'
        : 'live providers',
    settings: [
      ['OPENAI_API_KEY', env.OPENAI_API_KEY],
      ['FIRECRAWL_API_KEY', env.FIRECRAWL_API_KEY],
      ['AGENTMAIL_API_KEY', env.AGENTMAIL_API_KEY],
      ['AGENTMAIL_INBOX_ID', env.AGENTMAIL_INBOX_ID],
      ['AGENTMAIL_WEBHOOK_SECRET', env.AGENTMAIL_WEBHOOK_SECRET],
      ['AUTH_PRIVATE_KEY', env.AUTH_PRIVATE_KEY],
      ['AUTH_JWKS', env.AUTH_JWKS],
    ].map(([name, value]) => ({ name: name!, configured: !!value })),
    failedMailReceipts: (
      await ctx.db
        .query('activity')
        .withIndex('by_kind', (q) => q.eq('kind', 'receipt_failed'))
        .take(100)
    ).length,
  }),
});
