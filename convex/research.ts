import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import schema from './schema';
import { interpretation, researchResult, source, runState, leadStep, question } from './lib/validators';
import { requireProject } from './lib/access';
import {
  validateEvidence,
  orderRequirements,
  latestByKey,
  shareAuthorityQueries,
  supportingSentence,
  isSpecificDocument,
  documentLinkLabel,
} from './lib/domain';
import { startRun } from './lib/runs';
import { workflow } from './lib/workflow';
import { limits } from './lib/limits';
import { createThread } from '@convex-dev/agent';
import { components } from './_generated/api';

export const context = internalQuery({
  args: { runId: v.id('researchRuns'), revision: v.number() },
  returns: v.object({
    run: schema.doc('researchRuns'),
    project: schema.doc('projects'),
    sources: v.array(schema.doc('sources')),
    questions: v.array(schema.doc('questions')),
    requirements: v.array(schema.doc('requirements')),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('Research run missing.');
    const project = await ctx.db.get(run.projectId);
    if (!project || project.revision !== args.revision || run.revision !== args.revision)
      throw new Error('Research superseded by a newer revision.');
    const sources = await ctx.db
      .query('sources')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(30);
    const questions = await ctx.db
      .query('questions')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .order('desc')
      .take(12);
    const requirements = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    return { run, project, sources, questions: latestByKey(questions), requirements };
  },
});
export const setStage = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number(), stage: v.string(), state: runState },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    await ctx.db.patch(run._id, { stage: args.stage, state: args.state });
    await ctx.db.patch(project._id, { state: args.state, updatedAt: Date.now() });
    return null;
  },
});
export const reserve = internalMutation({
  args: {
    runId: v.id('researchRuns'),
    revision: v.number(),
    kind: v.union(v.literal('searches'), v.literal('scrapes'), v.literal('modelCalls')),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision)
      throw new Error('This research revision is no longer active.');
    const cap = run.trigger.startsWith('mail:')
      ? { searches: 2, scrapes: 2, modelCalls: 2 }
      : { searches: 16, scrapes: 14, modelCalls: 8 };
    if (run[args.kind] >= cap[args.kind] || run.tokens >= 48_000)
      throw new Error('Research budget reached. Existing findings are saved.');
    await ctx.db.patch(run._id, { [args.kind]: run[args.kind] + 1 });
    if (args.kind === 'modelCalls' || project.fixture) return 0;
    const result = await limits.limit(ctx, 'firecrawl', { reserve: true });
    return result.retryAfter ?? 0;
  },
});
export const tokens = internalMutation({
  args: { runId: v.id('researchRuns'), count: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.count) || args.count < 0 || args.count > 100_000)
      throw new Error('Invalid usage.');
    const run = await ctx.db.get(args.runId);
    if (run) await ctx.db.patch(run._id, { tokens: run.tokens + args.count });
    return null;
  },
});
export const initialize = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number(), result: interpretation },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const threadId =
      project.threadId ??
      (await createThread(ctx, components.agent, {
        userId: project.ownerId,
        title: args.result.title,
      }));
    await ctx.db.patch(project._id, {
      title: args.result.title,
      location: args.result.location,
      activity: args.result.activity,
      threadId,
    });
    if (args.result.missing) {
      await ctx.db.insert('questions', {
        projectId: project._id,
        runId: run._id,
        key: 'project-context',
        text: args.result.missing,
        reason: 'The location and activity help us find the right authorities.',
        options: [],
      });
      await ctx.db.patch(project._id, { state: 'needs_answer' });
      await ctx.db.patch(run._id, {
        state: 'needs_answer',
        stage: 'A little context before we begin',
      });
    }
    return null;
  },
});
export const saveSource = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number(), source },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const existing = await ctx.db
      .query('sources')
      .withIndex('by_projectId_and_url', (q) =>
        q.eq('projectId', project._id).eq('url', args.source.url),
      )
      .unique();
    const value = {
      ...args.source,
      text: args.source.text.slice(0, 9000),
      projectId: project._id,
      retrievedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else {
      const count = await ctx.db
        .query('sources')
        .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
        .take(30);
      if (count.length < 30) await ctx.db.insert('sources', value);
    }
    return null;
  },
});
export const publishLeads = internalMutation({
  args: {
    runId: v.id('researchRuns'),
    revision: v.number(),
    steps: v.array(leadStep),
    question: v.union(question, v.null()),
  },
  returns: v.object({ asked: v.boolean(), count: v.number() }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return { asked: false, count: 0 };
    const existing = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    const seen = new Set(existing.map((row) => row.key));
    let added = 0;
    for (const step of shareAuthorityQueries(args.steps).slice(0, 8)) {
      const key = step.key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      if (!key || seen.has(key) || existing.length + added >= 60) continue;
      seen.add(key);
      await ctx.db.insert('requirements', {
        projectId: project._id,
        key,
        title: step.title.slice(0, 200),
        authority: step.authority.slice(0, 200),
        kind: step.kind.slice(0, 80) || 'Step',
        applicability: 'checking',
        reason: `Mentioned in a local account and not confirmed yet. ${step.reason}`.slice(0, 500),
        nextAction: `Looking for the ${step.title} form or notification.`.slice(0, 300),
        documents: [],
        fee: null,
        duration: null,
        prerequisites: [],
        evidence: [],
        progress: 'not_started',
        tasks: [],
        events: [],
        leadQuery: step.query.slice(0, 300),
        updatedAt: Date.now(),
      });
      added++;
    }
    let asked = false;
    if (args.question && !run.refined && added > 0) {
      const questions = await ctx.db
        .query('questions')
        .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
        .take(12);
      const prior = questions.find((item) => item.key === args.question?.key);
      if (!prior) {
        await ctx.db.insert('questions', {
          ...args.question,
          options: args.question.options.slice(0, 4),
          projectId: project._id,
          runId: run._id,
        });
        asked = true;
      } else if (prior.answer === undefined) asked = true;
    }
    if (asked) {
      await ctx.db.patch(project._id, { state: 'needs_answer', updatedAt: Date.now() });
      await ctx.db.patch(run._id, {
        state: 'needs_answer',
        stage: 'One detail will change which steps apply',
      });
    } else if (added) {
      await ctx.db.patch(run._id, { stage: 'Checking each step against the official page' });
    }
    return { asked, count: added };
  },
});
export const confirmLead = internalMutation({
  args: {
    runId: v.id('researchRuns'),
    revision: v.number(),
    key: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const requirement = await ctx.db
      .query('requirements')
      .withIndex('by_projectId_and_key', (q) => q.eq('projectId', project._id).eq('key', args.key))
      .unique();
    if (!requirement) return null;
    const stored = await ctx.db
      .query('sources')
      .withIndex('by_projectId_and_url', (q) => q.eq('projectId', project._id).eq('url', args.url))
      .unique();
    if (!stored?.official || !isSpecificDocument(stored.url, stored.title)) {
      await ctx.db.patch(requirement._id, {
        applicability: 'checking',
        reason: `${requirement.authority} does not have an application form or notification on this page yet.`,
        evidence: [],
        updatedAt: Date.now(),
      });
      return null;
    }
    const excerpt = supportingSentence(stored.text, [
      requirement.title,
      requirement.authority,
      requirement.kind,
    ]);
    const link = documentLinkLabel(stored.url);
    const checked = validateEvidence(
      {
        key: requirement.key,
        title: requirement.title,
        authority: stored.authority || requirement.authority,
        kind: requirement.kind,
        applicability: 'required',
        reason: excerpt
          ? `${link} from ${stored.authority || requirement.authority}.`
          : 'We found an official page, but not a passage that states this step.',
        nextAction: `${link}: ${stored.title}.`.slice(0, 300),
        documents: stored.url.toLowerCase().includes('.pdf') ? [stored.title.slice(0, 200)] : [],
        fee: null,
        duration: null,
        prerequisites: requirement.prerequisites,
        evidence: excerpt ? [{ url: stored.url, excerpt, field: 'applicability' }] : [],
      },
      [stored],
    );
    await ctx.db.patch(requirement._id, {
      authority: checked.authority,
      applicability: checked.applicability,
      reason: checked.reason,
      evidence: checked.evidence,
      documents: checked.documents,
      fee: checked.fee,
      duration: checked.duration,
      prerequisites: checked.prerequisites,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(run._id, { stage: `Checked ${requirement.title}` });
    return null;
  },
});
export const settle = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const rows = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    const open = rows.some(
      (row) => row.applicability === 'checking' || row.applicability === 'needs_verification',
    );
    const state = !rows.length ? 'failed' : open ? 'partial' : 'ready';
    await ctx.db.patch(run._id, {
      state,
      stage: rows.length ? 'Your findings so far' : 'Research paused',
      ...(rows.length ? {} : { error: 'Research budget reached. Existing findings are saved.' }),
    });
    await ctx.db.patch(project._id, { state, updatedAt: Date.now() });
    return null;
  },
});
export const retireUnchecked = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const rows = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    const gaps = [...project.gaps];
    for (const row of rows) {
      if (row.applicability === 'not_applicable') continue;
      if (row.evidence.some((item) => isSpecificDocument(item.url))) continue;
      if (row.progress !== 'not_started' || row.tasks.length > 0 || row.events.length > 0) continue;
      const gap =
        row.applicability === 'required'
          ? `${row.title} (${row.authority}) still applies, but no application form, notification, or circular was found yet.`
          : `No application form, notification, or circular found yet for ${row.title} (${row.authority}).`;
      if (!gaps.includes(gap)) gaps.push(gap);
      await ctx.db.delete(row._id);
    }
    const remaining = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    const open = remaining.some(
      (row) => row.applicability !== 'required' && row.applicability !== 'not_applicable',
    );
    const state = !remaining.length || open || gaps.length ? 'partial' : 'ready';
    await ctx.db.patch(project._id, {
      gaps: gaps.slice(-12),
      state,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(run._id, {
      state,
      stage: remaining.some((row) => row.applicability === 'required')
        ? 'Your findings are ready'
        : 'No application form was found yet',
    });
    return null;
  },
});
export const applyResult = internalMutation({
  args: {
    runId: v.id('researchRuns'),
    revision: v.number(),
    result: researchResult,
    final: v.boolean(),
    keepConfirmed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const sources = await ctx.db
      .query('sources')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(30);
    const existingRows = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .take(60);
    const rows = args.result.requirements.slice(0, 15).map((r) => validateEvidence(r, sources));
    const { cycle } = orderRequirements(rows);
    let added = 0;
    for (const row of rows) {
      if (cycle) row.prerequisites = [];
      const existing = existingRows.find((r) => r.key === row.key);
      const keptDocument =
        args.keepConfirmed &&
        existing?.applicability === 'required' &&
        existing.evidence.some((item) => isSpecificDocument(item.url)) &&
        row.applicability === 'required' &&
        !row.evidence.some((item) => isSpecificDocument(item.url));
      const keep =
        args.keepConfirmed &&
        existing?.applicability === 'required' &&
        existing.evidence.length > 0 &&
        row.applicability === 'needs_verification';
      if ((keep || keptDocument) && existing) {
        if (row.prerequisites.length)
          await ctx.db.patch(existing._id, {
            prerequisites: row.prerequisites,
            updatedAt: Date.now(),
          });
      } else if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: Date.now() });
      else if (existingRows.length + added < 60) {
        await ctx.db.insert('requirements', {
          ...row,
          projectId: project._id,
          progress: 'not_started',
          tasks: [],
          events: [],
          updatedAt: Date.now(),
        });
        added++;
      }
    }
    if (!args.final) return null;
    // A changed answer must not leave an old confirmation looking current.
    if (!run.trigger.startsWith('mail:')) {
      for (const previous of existingRows) {
        if (
          !rows.some((row) => row.key === previous.key) &&
          previous.applicability !== 'needs_verification' &&
          !(
            args.keepConfirmed &&
            previous.applicability === 'required' &&
            previous.evidence.length > 0
          )
        ) {
          await ctx.db.patch(previous._id, {
            applicability: 'needs_verification',
            reason:
              'The latest research did not reconfirm this step. Review its earlier source or ask the authority.',
            updatedAt: Date.now(),
          });
        }
      }
    }
    const questions = !run.refined ? args.result.questions.slice(0, 3) : [];
    for (const q of questions)
      await ctx.db.insert('questions', { ...q, projectId: project._id, runId: run._id });
    const state = questions.length
      ? 'needs_answer'
      : args.result.gaps.length || !rows.length
        ? 'partial'
        : 'ready';
    await ctx.db.patch(project._id, {
      summary: args.result.summary,
      checked: args.result.checked.slice(0, 12),
      gaps: args.result.gaps.slice(0, 12),
      state,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(run._id, {
      state,
      stage: questions.length ? 'One detail will help shape your plan' : 'Your findings are ready',
    });
    await ctx.db.insert('activity', {
      ownerId: project.ownerId,
      projectId: project._id,
      key: `${run._id}:${args.revision}`,
      text: run.refined
        ? 'Your plan was refined with your answers.'
        : 'Research findings added to your plan.',
      kind: 'research',
      timestamp: Date.now(),
    });
    return null;
  },
});
export const fail = internalMutation({
  args: { runId: v.id('researchRuns'), revision: v.number(), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const project = run && (await ctx.db.get(run.projectId));
    if (!run || !project || project.revision !== args.revision) return null;
    const row = await ctx.db
      .query('requirements')
      .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
      .first();
    const state = row ? 'partial' : 'failed';
    await ctx.db.patch(run._id, {
      state,
      stage: 'Research paused',
      error: args.message.slice(0, 300),
    });
    await ctx.db.patch(project._id, {
      state,
      gaps: [...project.gaps, args.message.slice(0, 300)].slice(-12),
    });
    return null;
  },
});
export const answer = mutation({
  args: { questionId: v.id('questions'), answer: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new ConvexError('Question not found.');
    const project = await requireProject(ctx, question.projectId);
    if (!args.answer.trim() || args.answer.length > 500)
      throw new ConvexError('Keep your answer under 500 characters.');
    if (question.answer === args.answer.trim()) return null;
    if (['researching', 'refining', 'queued'].includes(project.state))
      throw new ConvexError('Let the current research finish before changing an answer.');
    await ctx.db.patch(question._id, { answer: args.answer.trim() });
    if (question.answer !== undefined) {
      await startRun(
        ctx,
        project,
        question.key === 'project-context' ? 'context-edit' : 'answer-edit',
      );
      return null;
    }
    const unanswered = await ctx.db
      .query('questions')
      .withIndex('by_runId', (q) => q.eq('runId', question.runId))
      .take(4);
    if (unanswered.some((q) => q._id !== question._id && q.answer === undefined)) return null;
    const run: Doc<'researchRuns'> | null = await ctx.db.get(question.runId);
    if (!run) throw new ConvexError('Research run not found.');
    const revision = project.revision + 1;
    await ctx.db.patch(project._id, { revision, state: 'refining' });
    await ctx.db.patch(run._id, {
      revision,
      state: 'refining',
      refined: question.key !== 'project-context',
      error: undefined,
    });
    const workflowId = await workflow.start(ctx, internal.workflows.researchFlow, {
      runId: run._id,
      revision,
    });
    await ctx.db.patch(run._id, { workflowId });
    return null;
  },
});
