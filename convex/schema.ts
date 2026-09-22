import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { applicability, event, evidence, mailChange, progress, runState } from './lib/validators';

export default defineSchema({
  users: defineTable({
    routingEmail: v.optional(v.string()),
    pendingEmail: v.optional(v.string()),
    connectionCode: v.optional(v.string()),
    connectionExpires: v.optional(v.number()),
  })
    .index('by_routingEmail', ['routingEmail'])
    .index('by_connectionCode', ['connectionCode']),
  projects: defineTable({
    ownerId: v.id('users'),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    activity: v.string(),
    revision: v.number(),
    threadId: v.optional(v.string()),
    state: runState,
    checked: v.array(v.string()),
    gaps: v.array(v.string()),
    summary: v.string(),
    requestId: v.string(),
    forwardingTag: v.string(),
    fixture: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_ownerId_and_requestId', ['ownerId', 'requestId'])
    .index('by_forwardingTag', ['forwardingTag']),
  researchRuns: defineTable({
    projectId: v.id('projects'),
    revision: v.number(),
    workflowId: v.optional(v.string()),
    state: runState,
    stage: v.string(),
    searches: v.number(),
    scrapes: v.number(),
    modelCalls: v.number(),
    tokens: v.number(),
    refined: v.boolean(),
    error: v.optional(v.string()),
    trigger: v.string(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_state', ['state']),
  sources: defineTable({
    projectId: v.id('projects'),
    url: v.string(),
    title: v.string(),
    authority: v.string(),
    text: v.string(),
    official: v.boolean(),
    retrievedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_url', ['projectId', 'url']),
  requirements: defineTable({
    projectId: v.id('projects'),
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
    progress,
    tasks: v.array(v.string()),
    events: v.array(event),
    leadQuery: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_key', ['projectId', 'key']),
  questions: defineTable({
    projectId: v.id('projects'),
    runId: v.id('researchRuns'),
    key: v.string(),
    text: v.string(),
    reason: v.string(),
    options: v.array(v.string()),
    answer: v.optional(v.string()),
  })
    .index('by_projectId', ['projectId'])
    .index('by_runId', ['runId']),
  mailMessages: defineTable({
    ownerId: v.id('users'),
    projectId: v.optional(v.id('projects')),
    inboxId: v.string(),
    messageId: v.string(),
    subject: v.string(),
    text: v.string(),
    sender: v.string(),
    attachments: v.array(v.string()),
    state: v.union(
      v.literal('unassigned'),
      v.literal('processing'),
      v.literal('review'),
      v.literal('applied'),
      v.literal('failed'),
    ),
    summary: v.string(),
    changes: v.array(mailChange),
    appliedIndexes: v.array(v.number()),
    receivedAt: v.number(),
    modelCalls: v.optional(v.number()),
    tokens: v.optional(v.number()),
  })
    .index('by_inboxId_and_messageId', ['inboxId', 'messageId'])
    .index('by_ownerId_and_state', ['ownerId', 'state'])
    .index('by_projectId', ['projectId']),
  activity: defineTable({
    ownerId: v.optional(v.id('users')),
    projectId: v.optional(v.id('projects')),
    key: v.string(),
    text: v.string(),
    kind: v.string(),
    timestamp: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_kind', ['kind'])
    .index('by_projectId', ['projectId']),
});
