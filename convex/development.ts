import { mutation } from './_generated/server';
import { internal } from './_generated/api';
import { v, ConvexError } from 'convex/values';
import { fixturesEnabled } from './lib/mode';
import { requireProject } from './lib/access';
import { fixtureNotice } from './integrations/fixtures';
import { workflow } from './lib/workflow';

export const sampleNotice = mutation({
  args: { projectId: v.id('projects') },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!fixturesEnabled()) throw new ConvexError('Local development only.');
    const project = await requireProject(ctx, args.projectId);
    const messageId = `fixture-notice-${project._id}`;
    const existing = await ctx.db
      .query('mailMessages')
      .withIndex('by_inboxId_and_messageId', (q) =>
        q.eq('inboxId', 'local-fixture').eq('messageId', messageId),
      )
      .unique();
    if (existing) return null;
    const id = await ctx.db.insert('mailMessages', {
      ownerId: project.ownerId,
      projectId: project._id,
      inboxId: 'local-fixture',
      messageId,
      subject: 'Your premises inspection is scheduled',
      text: fixtureNotice,
      sender: 'Synthetic development notice',
      attachments: ['Form B.pdf'],
      state: 'processing',
      summary: '',
      changes: [],
      appliedIndexes: [],
      receivedAt: Date.now(),
    });
    await workflow.start(ctx, internal.mailWorkflows.process, { messageId: id });
    return null;
  },
});
