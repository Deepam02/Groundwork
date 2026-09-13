import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { startRun } from './lib/runs';

export const deferred = internalMutation({
  args: { messageId: v.id('mailMessages') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.projectId) return null;
    const project = await ctx.db.get(message.projectId);
    if (!project) return null;
    await ctx.db.patch(project._id, {
      gaps: [
        ...project.gaps,
        'Your notice updated the plan, but its new rule needs a research retry when quota is available.',
      ].slice(-12),
    });
    return null;
  },
});

export const start = internalMutation({
  args: { messageId: v.id('mailMessages'), query: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.projectId) return null;
    const project = await ctx.db.get(message.projectId);
    if (!project) return null;
    if (['queued', 'researching', 'refining'].includes(project.state)) {
      await ctx.db.patch(project._id, {
        gaps: [
          ...project.gaps,
          'A notice referenced a new rule. Re-run research after this pass finishes.',
        ].slice(-12),
      });
      return null;
    }
    await startRun(ctx, project, `mail:${args.query.slice(0, 200)}`);
    return null;
  },
});
