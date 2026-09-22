import { v } from 'convex/values';

export const applicability = v.union(
  v.literal('checking'),
  v.literal('required'),
  v.literal('not_applicable'),
  v.literal('needs_verification'),
);
export const progress = v.union(
  v.literal('not_started'),
  v.literal('in_progress'),
  v.literal('submitted'),
  v.literal('scheduled'),
  v.literal('done'),
);
export const runState = v.union(
  v.literal('queued'),
  v.literal('researching'),
  v.literal('needs_answer'),
  v.literal('refining'),
  v.literal('ready'),
  v.literal('partial'),
  v.literal('failed'),
);
/** Where a step sits between "a local account mentioned it" and "an official page states it". */
export const requirementStage = v.union(
  v.literal('lead'),
  v.literal('confirmed'),
  v.literal('dismissed'),
);
export const sourceKind = v.union(
  v.literal('apply'),
  v.literal('form'),
  v.literal('notice'),
  v.literal('guidance'),
  v.literal('lead'),
);
export const trailKind = v.union(
  v.literal('phase'),
  v.literal('thought'),
  v.literal('search'),
  v.literal('candidate'),
  v.literal('read'),
  v.literal('confirm'),
  v.literal('gap'),
);
export const trailVerdict = v.union(
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('running'),
  v.literal('failed'),
);
export const evidence = v.object({ url: v.string(), excerpt: v.string(), field: v.string() });
export const event = v.object({ label: v.string(), date: v.string(), source: v.string() });
export const requirement = v.object({
  key: v.string(),
  title: v.string(),
  authority: v.string(),
  kind: v.string(),
  applicability,
  reason: v.string(),
  nextAction: v.string(),
  documents: v.array(v.string()),
  fee: v.union(v.string(), v.null()),
  duration: v.union(v.string(), v.null()),
  prerequisites: v.array(v.string()),
  evidence: v.array(evidence),
  applyUrl: v.optional(v.union(v.string(), v.null())),
});
export const source = v.object({
  url: v.string(),
  title: v.string(),
  authority: v.string(),
  text: v.string(),
  official: v.boolean(),
  kind: v.optional(sourceKind),
});
export const question = v.object({
  key: v.string(),
  text: v.string(),
  reason: v.string(),
  options: v.array(v.string()),
});
export const researchResult = v.object({
  requirements: v.array(requirement),
  questions: v.array(question),
  checked: v.array(v.string()),
  gaps: v.array(v.string()),
  summary: v.string(),
});
export const interpretation = v.object({
  title: v.string(),
  location: v.string(),
  activity: v.string(),
  queries: v.array(v.string()),
  missing: v.union(v.string(), v.null()),
  /** One sentence of intent, shown as the first line of the research trail. */
  plan: v.optional(v.string()),
});
export const candidate = v.object({ url: v.string(), title: v.string(), description: v.string() });
export const leadStep = v.object({
  key: v.string(),
  title: v.string(),
  authority: v.string(),
  kind: v.string(),
  reason: v.string(),
  query: v.string(),
});
export const procedure = v.object({
  steps: v.array(leadStep),
  question: v.union(question, v.null()),
});
export const officialPick = v.object({
  key: v.string(),
  url: v.string(),
  title: v.string(),
  authority: v.string(),
  kind: v.optional(sourceKind),
});
/** Picks plus the candidates that were turned down, so the trail can say why. */
export const officialReview = v.object({
  picks: v.array(officialPick),
  rejected: v.array(v.object({ url: v.string(), title: v.string(), reason: v.string() })),
});
export const trailEntry = v.object({
  kind: trailKind,
  label: v.string(),
  detail: v.optional(v.string()),
  url: v.optional(v.string()),
  verdict: v.optional(trailVerdict),
  stepKey: v.optional(v.string()),
});
export const authorities = v.object({ hosts: v.array(v.string()), queries: v.array(v.string()) });
export const mailChange = v.object({
  requirementKey: v.string(),
  title: v.string(),
  tasks: v.array(v.string()),
  date: v.union(v.string(), v.null()),
  progress,
  excerpt: v.string(),
  certain: v.boolean(),
});
export const mailResult = v.object({
  summary: v.string(),
  changes: v.array(mailChange),
  researchQuery: v.union(v.string(), v.null()),
});
