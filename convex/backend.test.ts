/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import rateLimiter from '@convex-dev/rate-limiter/test';
import schema from './schema';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { requirement } from '../tests/unit/fixtures';

const modules = import.meta.glob('./**/*.ts');
const makeTest = () => convexTest(schema, modules);
let t: ReturnType<typeof makeTest>;
let owner: Id<'users'>;
let other: Id<'users'>;
let project: Id<'projects'>;
let row: Id<'requirements'>;
let run: Id<'researchRuns'>;
beforeEach(async () => {
  t = makeTest();
  rateLimiter.register(t);
  await t.run(async (ctx) => {
    owner = await ctx.db.insert('users', { routingEmail: 'owner@example.org' });
    other = await ctx.db.insert('users', { routingEmail: 'other@example.org' });
    project = await ctx.db.insert('projects', {
      ownerId: owner,
      title: 'Test project',
      description: 'A studio in a new jurisdiction.',
      location: 'Example',
      activity: 'Studio',
      revision: 2,
      state: 'ready',
      checked: [],
      gaps: [],
      summary: '',
      requestId: 'test-request',
      forwardingTag: 'AABBCCDD',
      fixture: false,
      updatedAt: 0,
    });
    row = await ctx.db.insert('requirements', {
      ...requirement,
      projectId: project,
      progress: 'done',
      tasks: ['Preserve this task'],
      events: [],
      updatedAt: 0,
    });
    run = await ctx.db.insert('researchRuns', {
      projectId: project,
      revision: 2,
      state: 'ready',
      stage: 'Ready',
      searches: 0,
      scrapes: 0,
      modelCalls: 0,
      tokens: 0,
      refined: true,
      trigger: 'initial',
    });
  });
});
describe('project ownership', () => {
  it('refuses unauthenticated and other-user reads and writes', async () => {
    await expect(t.query(api.projects.workspace, { projectId: project })).rejects.toThrow();
    const stranger = t.withIdentity({ subject: other });
    expect(await stranger.query(api.projects.list, {})).toEqual([]);
    await expect(stranger.query(api.projects.workspace, { projectId: project })).rejects.toThrow();
    await expect(
      stranger.mutation(api.projects.setProgress, { requirementId: row, progress: 'submitted' }),
    ).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(row)))?.progress).toBe('done');
  });
  it('saves owner progress idempotently', async () => {
    const client = t.withIdentity({ subject: owner });
    await client.mutation(api.projects.setProgress, {
      requirementId: row,
      progress: 'in_progress',
    });
    await client.mutation(api.projects.setProgress, {
      requirementId: row,
      progress: 'in_progress',
    });
    const snapshot = await client.query(api.projects.workspace, { projectId: project });
    expect(snapshot.requirements[0].progress).toBe('in_progress');
    expect(snapshot.activity).toHaveLength(1);
  });
});
describe('durable research boundaries', () => {
  const result = {
    requirements: [requirement],
    questions: [],
    checked: ['Planning'],
    gaps: [],
    summary: 'Research result',
  };
  it('ignores stale workflow writes', async () => {
    await t.mutation(internal.research.applyResult, {
      runId: run,
      revision: 1,
      result,
      final: true,
    });
    expect((await t.run((ctx) => ctx.db.get(project)))?.summary).toBe('');
  });
  it('preserves manual progress and tasks while replacing research facts', async () => {
    await t.mutation(internal.research.applyResult, {
      runId: run,
      revision: 2,
      result,
      final: true,
    });
    const updated = await t.run((ctx) => ctx.db.get(row));
    expect(updated?.progress).toBe('done');
    expect(updated?.tasks).toEqual(['Preserve this task']);
    expect(updated?.applicability).toBe('needs_verification');
  });
  it('enforces a persisted model-call cap', async () => {
    for (let i = 0; i < 6; i++)
      await t.mutation(internal.research.reserve, { runId: run, revision: 2, kind: 'modelCalls' });
    await expect(
      t.mutation(internal.research.reserve, { runId: run, revision: 2, kind: 'modelCalls' }),
    ).rejects.toThrow('budget');
  });
});
describe('one shared inbox', () => {
  it('keeps an untagged message unassigned when its owner has several projects', async () => {
    await t.run(async (ctx) => {
      const first = (await ctx.db.get(project))!;
      const { _id, _creationTime, ...fields } = first;
      void _id;
      void _creationTime;
      await ctx.db.insert('projects', {
        ...fields,
        requestId: 'second',
        forwardingTag: '11223344',
      });
    });
    const messageId = await t.mutation(internal.mailData.ingest, {
      inboxId: 'test-inbox',
      messageId: 'ambiguous',
      sender: 'owner@example.org',
      subject: 'Project update',
      text: 'An inspection notice for a project.',
      attachments: [],
    });
    const message = await t.run((ctx) => ctx.db.get(messageId!));
    expect(message?.ownerId).toBe(owner);
    expect(message?.state).toBe('unassigned');
    expect(
      await t.withIdentity({ subject: owner }).query(api.inbox.list, { projectId: project }),
    ).toHaveLength(1);
  });
  const incoming = {
    inboxId: 'test-inbox',
    messageId: 'notice-1',
    sender: 'owner@example.org',
    subject: 'Inspection [GW-AABBCCDD]',
    text: 'Inspection is scheduled for September 22. Bring Form B.',
    attachments: [],
  };
  it('deduplicates incoming notices and never trusts a tag to choose an owner', async () => {
    const id = await t.mutation(internal.mailData.ingest, incoming);
    expect(id).not.toBeNull();
    expect(await t.mutation(internal.mailData.ingest, incoming)).toBeNull();
    expect(
      await t.mutation(internal.mailData.ingest, {
        ...incoming,
        messageId: 'unknown',
        sender: 'unconnected@example.org',
      }),
    ).toBeNull();
    const otherId = await t.mutation(internal.mailData.ingest, {
      ...incoming,
      messageId: 'other',
      sender: 'other@example.org',
    });
    const received = await t.run((ctx) => ctx.db.get(otherId!));
    expect(received?.ownerId).toBe(other);
    expect(received?.projectId).toBeUndefined();
  });
  it('requires proof from the claimed forwarding sender', async () => {
    const code = 'a'.repeat(32);
    await t.run((ctx) =>
      ctx.db.patch(other, {
        pendingEmail: 'new@example.org',
        connectionCode: code,
        connectionExpires: Date.now() + 60_000,
      }),
    );
    await t.mutation(internal.mailData.ingest, { ...incoming, subject: `GW-CONNECT-${code}` });
    expect((await t.run((ctx) => ctx.db.get(other)))?.routingEmail).toBe('other@example.org');
    await t.mutation(internal.mailData.ingest, {
      ...incoming,
      sender: 'new@example.org',
      subject: `GW-CONNECT-${code}`,
    });
    expect((await t.run((ctx) => ctx.db.get(other)))?.routingEmail).toBe('new@example.org');
    expect((await t.run((ctx) => ctx.db.get(other)))?.connectionCode).toBeUndefined();
  });
  it('requires review before overwriting a completed step and applies a confirmation once', async () => {
    const id = (await t.mutation(internal.mailData.ingest, incoming))!;
    await t.mutation(internal.mailData.saveResult, {
      messageId: id,
      result: {
        summary: 'An inspection notice',
        researchQuery: null,
        changes: [
          {
            requirementKey: 'planning',
            title: 'Inspection',
            tasks: ['Bring Form B'],
            date: 'September 22',
            progress: 'scheduled',
            certain: true,
            excerpt: incoming.text,
          },
        ],
      },
    });
    expect((await t.run((ctx) => ctx.db.get(row)))?.progress).toBe('done');
    await expect(
      t.withIdentity({ subject: other }).mutation(api.inbox.confirm, { messageId: id, index: 0 }),
    ).rejects.toThrow();
    const client = t.withIdentity({ subject: owner });
    await client.mutation(api.inbox.confirm, { messageId: id, index: 0 });
    await client.mutation(api.inbox.confirm, { messageId: id, index: 0 });
    const updated = await t.run((ctx) => ctx.db.get(row));
    expect(updated?.progress).toBe('scheduled');
    expect(updated?.events).toHaveLength(1);
  });
});
