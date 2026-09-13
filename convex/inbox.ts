import { v, ConvexError } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireProject } from './lib/access';
import { workflow } from './lib/workflow';
import schema from './schema';
import { applyChange } from './mailData';

export const list = query({
  args: { projectId: v.id('projects') },
  returns: v.array(schema.doc('mailMessages')),
  handler: async (ctx, args) => {
    const project = await requireProject(ctx, args.projectId);
    const [assigned, unassigned] = await Promise.all([
      ctx.db
        .query('mailMessages')
        .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(30),
      ctx.db
        .query('mailMessages')
        .withIndex('by_ownerId_and_state', (q) =>
          q.eq('ownerId', project.ownerId).eq('state', 'unassigned'),
        )
        .order('desc')
        .take(20),
    ]);
    return [...assigned, ...unassigned].sort((a, b) => b.receivedAt - a.receivedAt);
  },
});
export const assign = mutation({
  args: { messageId: v.id('mailMessages'), projectId: v.id('projects') },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const project = await requireProject(ctx, args.projectId);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.ownerId !== project.ownerId)
      throw new ConvexError('Message not found.');
    if (message.projectId === project._id && message.state !== 'failed') return null;
    if (message.projectId && message.projectId !== project._id)
      throw new ConvexError('This message is already assigned.');
    await ctx.db.patch(message._id, { projectId: project._id, state: 'processing' });
    await workflow.start(ctx, internal.mailWorkflows.process, { messageId: message._id });
    return null;
  },
});
export const confirm = mutation({
  args: { messageId: v.id('mailMessages'), index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.projectId) throw new ConvexError('Message not found.');
    const project = await requireProject(ctx, message.projectId);
    if (
      message.ownerId !== project.ownerId ||
      !Number.isInteger(args.index) ||
      args.index < 0 ||
      args.index >= message.changes.length
    )
      throw new ConvexError('Change not found.');
    await applyChange(ctx, message, args.index);
    const updated = (await ctx.db.get(message._id))!;
    if (updated.appliedIndexes.length === updated.changes.length)
      await ctx.db.patch(message._id, { state: 'applied' });
    return null;
  },
});
