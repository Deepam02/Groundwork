import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v, ConvexError } from 'convex/values';
import schema from './schema';
import { requireUser, requireProject } from './lib/access';
import { fixturesEnabled } from './lib/mode';
import { startRun } from './lib/runs';
import { progress } from './lib/validators';
import { latestByKey } from './lib/domain';

export const list = query({
  args: {},
  returns: v.array(schema.doc('projects')),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return ctx.db
      .query('projects')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', user._id))
      .order('desc')
      .take(20);
  },
});
export const create = mutation({
  args: { description: v.string(), requestId: v.string() },
  returns: v.id('projects'),
  handler: async (ctx, args): Promise<Id<'projects'>> => {
    const user = await requireUser(ctx);
    const description = args.description.trim();
    if (description.length < 12 || description.length > 2000 || args.requestId.length > 80)
      throw new ConvexError(
        'Describe your project in 12–2,000 characters, including its location.',
      );
    const previous = await ctx.db
      .query('projects')
      .withIndex('by_ownerId_and_requestId', (q) =>
        q.eq('ownerId', user._id).eq('requestId', args.requestId),
      )
      .unique();
    if (previous) return previous._id;
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', user._id))
      .take(10);
    if (projects.length >= 10)
      throw new ConvexError('You have reached this demo’s ten-project limit.');
    const id = await ctx.db.insert('projects', {
      ownerId: user._id,
      description,
      title: 'Your next chapter',
      location: '',
      activity: '',
      state: 'queued',
      revision: 0,
      checked: [],
      gaps: [],
      summary: '',
      requestId: args.requestId,
      forwardingTag: crypto.randomUUID().slice(0, 8).toUpperCase(),
      fixture: fixturesEnabled(),
      updatedAt: Date.now(),
    });
    const project = await ctx.db.get(id);
    await startRun(ctx, project!);
    return id;
  },
});
export const workspace = query({
  args: { projectId: v.id('projects') },
  returns: v.object({
    project: schema.doc('projects'),
    requirements: v.array(schema.doc('requirements')),
    questions: v.array(schema.doc('questions')),
    run: v.union(schema.doc('researchRuns'), v.null()),
    sources: v.array(schema.doc('sources').omit('text')),
    activity: v.array(schema.doc('activity')),
  }),
  handler: async (ctx, { projectId }) => {
    const project = await requireProject(ctx, projectId);
    const [requirements, questions, run, sources, activity] = await Promise.all([
      ctx.db
        .query('requirements')
        .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
        .take(60),
      ctx.db
        .query('questions')
        .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
        .order('desc')
        .take(12),
      ctx.db
        .query('researchRuns')
        .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
        .order('desc')
        .first(),
      ctx.db
        .query('sources')
        .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
        .take(30),
      ctx.db
        .query('activity')
        .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
        .order('desc')
        .take(12),
    ]);
    return {
      project,
      requirements,
      questions: latestByKey(questions),
      run,
      sources: sources.map((s) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        projectId: s.projectId,
        url: s.url,
        title: s.title,
        authority: s.authority,
        official: s.official,
        retrievedAt: s.retrievedAt,
      })),
      activity,
    };
  },
});
export const setProgress = mutation({
  args: { requirementId: v.id('requirements'), progress },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requirementId);
    if (!row) throw new ConvexError('Requirement not found.');
    const project = await requireProject(ctx, row.projectId);
    if (row.progress === args.progress) return null;
    await ctx.db.patch(row._id, { progress: args.progress, updatedAt: Date.now() });
    await ctx.db.insert('activity', {
      ownerId: project.ownerId,
      projectId: project._id,
      key: crypto.randomUUID(),
      text: `${row.title} · ${args.progress.replaceAll('_', ' ')}`,
      kind: 'progress',
      timestamp: Date.now(),
    });
    return null;
  },
});
export const retry = mutation({
  args: { projectId: v.id('projects') },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const project = await requireProject(ctx, projectId);
    if (['queued', 'researching', 'refining'].includes(project.state))
      throw new ConvexError('Research is already running.');
    await startRun(ctx, project, 'retry');
    return null;
  },
});
