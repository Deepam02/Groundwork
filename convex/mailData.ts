import { internalMutation, internalQuery } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';
import schema from './schema';
import { mailResult } from './lib/validators';
import { validateMailChanges } from './lib/domain';
import { limits } from './lib/limits';
import { workflow } from './lib/workflow';
import { internal } from './_generated/api';

export const incomingArgs = {
  inboxId: v.string(),
  messageId: v.string(),
  sender: v.string(),
  subject: v.string(),
  text: v.string(),
  attachments: v.array(v.string()),
};
export const requirementsForResearch = internalQuery({
  args: { projectId: v.id('projects') },
  returns: v.array(schema.doc('requirements')),
  handler: async (ctx, args) =>
    ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
      .take(60),
});
export const receipt = internalMutation({
  args: { eventId: v.string(), inboxId: v.string(), messageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `receipt:${args.inboxId}:${args.messageId}`;
    const receipt = await ctx.db
      .query('activity')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique();
    if (receipt && receipt.kind !== 'receipt_failed') return null;
    if (receipt) await ctx.db.patch(receipt._id, { kind: 'receipt', timestamp: Date.now() });
    else
      await ctx.db.insert('activity', {
        key,
        text: 'Incoming correspondence accepted.',
        kind: 'receipt',
        timestamp: Date.now(),
      });
    await workflow.start(ctx, internal.mailWorkflows.receive, {
      inboxId: args.inboxId,
      messageId: args.messageId,
    });
    return null;
  },
});
export const receiptFailed = internalMutation({
  args: { inboxId: v.string(), messageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query('activity')
      .withIndex('by_key', (q) => q.eq('key', `receipt:${args.inboxId}:${args.messageId}`))
      .unique();
    if (receipt)
      await ctx.db.patch(receipt._id, {
        kind: 'receipt_failed',
        text: 'Mail retrieval failed. Retry this delivery from the provider after checking the connection.',
      });
    return null;
  },
});
export const reserveInference = internalMutation({
  args: { messageId: v.id('mailMessages') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || (message.modelCalls ?? 0) >= 3)
      throw new Error('Message processing budget reached.');
    await ctx.db.patch(message._id, { modelCalls: (message.modelCalls ?? 0) + 1 });
    return null;
  },
});
export const recordUsage = internalMutation({
  args: { messageId: v.id('mailMessages'), tokens: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && args.tokens >= 0 && Number.isFinite(args.tokens))
      await ctx.db.patch(message._id, { tokens: (message.tokens ?? 0) + args.tokens });
    return null;
  },
});
export const ingest = internalMutation({
  args: incomingArgs,
  returns: v.union(v.id('mailMessages'), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('mailMessages')
      .withIndex('by_inboxId_and_messageId', (q) =>
        q.eq('inboxId', args.inboxId).eq('messageId', args.messageId),
      )
      .unique();
    if (existing) return null;
    const code = args.subject.match(/GW-CONNECT-([a-f0-9]{32})/i)?.[1]?.toLowerCase();
    if (code) {
      const pending = await ctx.db
        .query('users')
        .withIndex('by_connectionCode', (q) => q.eq('connectionCode', code))
        .unique();
      const owner = await ctx.db
        .query('users')
        .withIndex('by_routingEmail', (q) => q.eq('routingEmail', args.sender))
        .unique();
      if (
        pending &&
        pending.pendingEmail === args.sender &&
        (pending.connectionExpires ?? 0) > Date.now() &&
        (!owner || owner._id === pending._id)
      ) {
        await ctx.db.patch(pending._id, {
          routingEmail: args.sender,
          pendingEmail: undefined,
          connectionCode: undefined,
          connectionExpires: undefined,
        });
      }
      return null;
    }
    const user = await ctx.db
      .query('users')
      .withIndex('by_routingEmail', (q) => q.eq('routingEmail', args.sender))
      .unique();
    if (!user) return null;
    const allowed = await limits.limit(ctx, 'mail', { key: user._id });
    if (!allowed.ok) return null;
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', user._id))
      .take(11);
    const tag = args.subject.match(/\[GW-([A-F0-9]{8})\]/i)?.[1]?.toUpperCase();
    const project = tag
      ? projects.find((p) => p.forwardingTag === tag)
      : projects.length === 1
        ? projects[0]
        : undefined;
    return ctx.db.insert('mailMessages', {
      ...args,
      text: args.text.slice(0, 20000),
      attachments: args.attachments.slice(0, 12),
      ownerId: user._id,
      ...(project ? { projectId: project._id } : {}),
      state: project ? 'processing' : 'unassigned',
      summary: '',
      changes: [],
      appliedIndexes: [],
      receivedAt: Date.now(),
    });
  },
});
export const context = internalQuery({
  args: { messageId: v.id('mailMessages') },
  returns: v.union(
    v.object({
      message: schema.doc('mailMessages'),
      project: schema.doc('projects'),
      requirements: v.array(schema.doc('requirements')),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.projectId) return null;
    const project = await ctx.db.get(message.projectId);
    if (!project || project.ownerId !== message.ownerId) return null;
    const requirements = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    return { message, project, requirements };
  },
});
export async function applyChange(
  ctx: import('./_generated/server').MutationCtx,
  message: Doc<'mailMessages'>,
  index: number,
) {
  if (!message.projectId || message.appliedIndexes.includes(index)) return;
  const change = message.changes[index];
  if (!change) return;
  let row = await ctx.db
    .query('requirements')
    .withIndex('by_projectId_and_key', (q) =>
      q.eq('projectId', message.projectId!).eq('key', change.requirementKey),
    )
    .unique();
  if (!row) {
    const rows = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', message.projectId!))
      .take(60);
    if (rows.length >= 60) return;
    const id = await ctx.db.insert('requirements', {
      projectId: message.projectId,
      key: change.requirementKey,
      title: change.title,
      authority: 'From your correspondence',
      kind: 'Follow-up',
      applicability: 'needs_verification',
      reason:
        'This item was mentioned in forwarded correspondence; official applicability has not been independently verified.',
      nextAction: change.tasks[0] ?? 'Review the forwarded notice.',
      documents: [],
      fee: null,
      duration: null,
      prerequisites: [],
      evidence: [],
      progress: 'not_started',
      tasks: [],
      events: [],
      updatedAt: Date.now(),
    });
    row = await ctx.db.get(id);
  }
  if (!row) return;
  await ctx.db.patch(row._id, {
    progress: change.progress,
    tasks: [...new Set([...row.tasks, ...change.tasks])].slice(0, 20),
    events: change.date
      ? [...row.events, { label: change.title, date: change.date, source: message._id }].slice(-12)
      : row.events,
    updatedAt: Date.now(),
  });
  await ctx.db.patch(message._id, { appliedIndexes: [...message.appliedIndexes, index] });
  await ctx.db.insert('activity', {
    ownerId: message.ownerId,
    projectId: message.projectId,
    key: `${message._id}:${index}`,
    text: `${change.title}${change.date ? ` · ${change.date}` : ''} updated from correspondence.`,
    kind: 'mail',
    timestamp: Date.now(),
  });
}
export const saveResult = internalMutation({
  args: { messageId: v.id('mailMessages'), result: mailResult },
  returns: v.null(),
  handler: async (ctx, args) => {
    let message = await ctx.db.get(args.messageId);
    if (!message?.projectId || message.state !== 'processing') return null;
    const changes = validateMailChanges(args.result.changes, message.text);
    await ctx.db.patch(message._id, { changes, summary: args.result.summary });
    for (let i = 0; i < changes.length; i++) {
      message = (await ctx.db.get(args.messageId))!;
      const row = await ctx.db
        .query('requirements')
        .withIndex('by_projectId_and_key', (q) =>
          q.eq('projectId', message!.projectId!).eq('key', changes[i].requirementKey),
        )
        .unique();
      if (changes[i].certain && changes[i].progress !== 'done' && row?.progress !== 'done')
        await applyChange(ctx, message, i);
    }
    message = (await ctx.db.get(args.messageId))!;
    await ctx.db.patch(message._id, {
      state: message.appliedIndexes.length === changes.length ? 'applied' : 'review',
    });
    return null;
  },
});
export const fail = internalMutation({
  args: { messageId: v.id('mailMessages') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message)
      await ctx.db.patch(message._id, {
        state: 'failed',
        summary: 'This message could not be processed. Check the connection and retry.',
      });
    return null;
  },
});
