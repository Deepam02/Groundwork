import { internalMutation, mutation, query, env } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { requireUser } from './lib/access';
import { normalizeEmail } from './lib/domain';
import { limits } from './lib/limits';
import { fixturesEnabled } from './lib/mode';

export const createUser = internalMutation({
  args: {
    provider: v.literal('password'),
    providerAccountId: v.string(),
    profile: v.object({ username: v.string() }),
  },
  returns: v.id('users'),
  handler: async (ctx) => ctx.db.insert('users', {}),
});
export const current = query({
  args: {},
  returns: v.object({
    id: v.id('users'),
    email: v.union(v.string(), v.null()),
    pendingEmail: v.union(v.string(), v.null()),
    code: v.union(v.string(), v.null()),
    expires: v.union(v.number(), v.null()),
    inbox: v.union(v.string(), v.null()),
    fixture: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return {
      id: user._id,
      email: user.routingEmail ?? null,
      pendingEmail: user.pendingEmail ?? null,
      code: user.connectionCode ?? null,
      expires: user.connectionExpires ?? null,
      inbox: env.AGENTMAIL_INBOX_ID ?? null,
      fixture: fixturesEnabled(),
    };
  },
});
export const connectEmail = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const user = await requireUser(ctx);
    await limits.limit(ctx, 'connect', { key: user._id, throws: true });
    let normalized: string;
    try {
      normalized = normalizeEmail(email);
    } catch {
      throw new ConvexError('Enter a valid email address.');
    }
    const existing = await ctx.db
      .query('users')
      .withIndex('by_routingEmail', (q) => q.eq('routingEmail', normalized))
      .unique();
    if (existing && existing._id !== user._id)
      throw new ConvexError('This address is already connected.');
    await ctx.db.patch(user._id, {
      pendingEmail: normalized,
      connectionCode: crypto.randomUUID().replaceAll('-', ''),
      connectionExpires: Date.now() + HOUR,
    });
    return null;
  },
});
const HOUR = 3_600_000;
