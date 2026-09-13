import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { workflow } from './workflow';
import { limits } from './limits';

export async function startRun(
  ctx: MutationCtx,
  project: Doc<'projects'>,
  trigger = 'initial',
): Promise<Id<'researchRuns'>> {
  await limits.limit(ctx, 'projectRuns', { key: project.ownerId, throws: true });
  await limits.limit(ctx, 'globalRuns', { throws: true });
  const revision = project.revision + 1;
  await ctx.db.patch(project._id, { revision, state: 'queued', updatedAt: Date.now() });
  const runId = await ctx.db.insert('researchRuns', {
    projectId: project._id,
    revision,
    state: 'queued',
    stage: 'Getting the lay of the land',
    searches: 0,
    scrapes: 0,
    modelCalls: 0,
    tokens: 0,
    refined: trigger.startsWith('mail:') || trigger === 'answer-edit',
    trigger,
  });
  const workflowId = await workflow.start(ctx, internal.workflows.researchFlow, {
    runId,
    revision,
  });
  await ctx.db.patch(runId, { workflowId });
  return runId;
}
