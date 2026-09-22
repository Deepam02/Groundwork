import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { requireProject } from './lib/access';
import { trailEntry, trailVerdict } from './lib/validators';
import { searchDomain } from './lib/sources';

/**
 * The visible record of how a plan was reached: every query run, every
 * candidate accepted or turned down and why, every page read. It is the
 * product's argument that the research is real, so it is stored rather than
 * logged, and it survives the run for anyone reviewing the plan later.
 */
const MAX_EVENTS = 160;

export const append = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number(), entries: v.array(trailEntry) },
  returns: v.array(v.id('researchEvents')),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return [];
    let count = run.trailCount ?? 0;
    const ids: Id<'researchEvents'>[] = [];
    const now = Date.now();
    for (const entry of args.entries) {
      if (count >= MAX_EVENTS) break;
      count++;
      ids.push(
        await ctx.db.insert('researchEvents', {
          projectId: project._id,
          runId: run._id,
          revision: args.revision,
          kind: entry.kind,
          label: entry.label.slice(0, 300),
          detail: entry.detail?.slice(0, 700) || undefined,
          url: entry.url,
          host: entry.url ? (searchDomain(entry.url) ?? undefined) : undefined,
          verdict: entry.verdict,
          stepKey: entry.stepKey,
          timestamp: now,
        }),
      );
    }
    if (count !== (run.trailCount ?? 0)) await ctx.db.patch(run._id, { trailCount: count });
    return ids;
  },
});

/** Resolves a `running` entry in place so the feed does not show two lines per page. */
export const settleEntry = internalMutation({
  args: {
    eventId: v.id('researchEvents'),
    verdict: trailVerdict,
    detail: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    await ctx.db.patch(event._id, {
      verdict: args.verdict,
      ...(args.detail === undefined ? {} : { detail: args.detail.slice(0, 700) }),
      ...(args.label === undefined ? {} : { label: args.label.slice(0, 300) }),
    });
    return null;
  },
});

export const forProject = query({
  args: { projectId: v.id('projects') },
  returns: v.array(schema.doc('researchEvents')),
  handler: async (ctx, { projectId }) => {
    await requireProject(ctx, projectId);
    // Newest are the ones worth keeping when a project has been researched twice,
    // but the feed reads top-to-bottom, so hand them back in order.
    const recent = await ctx.db
      .query('researchEvents')
      .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
      .order('desc')
      .take(MAX_EVENTS);
    return recent.reverse();
  },
});
