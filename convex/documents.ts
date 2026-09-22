import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, query, env } from './_generated/server';
import { internal } from './_generated/api';
import { requireProject } from './lib/access';
import { publicUrl, isPdf, classifySource, sourceKindLabels } from './lib/domain';
import { sourceKind } from './lib/validators';

/**
 * Authorities publish binding detail as PDFs, and almost none of them allow
 * their site to be framed. Copying the file into Convex storage once means the
 * evidence can be read beside the claim it supports instead of behind a link.
 */
const MAX_BYTES = 8 * 1024 * 1024;

export const pending = internalQuery({
  args: { sourceId: v.id('sources') },
  returns: v.union(
    v.object({ url: v.string(), title: v.string(), cached: v.boolean() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return null;
    return { url: source.url, title: source.title, cached: Boolean(source.fileId) };
  },
});

export const attach = internalMutation({
  args: { sourceId: v.id('sources'), fileId: v.id('_storage') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return await ctx.storage.delete(args.fileId);
    if (source.fileId) return await ctx.storage.delete(args.fileId);
    await ctx.db.patch(source._id, { fileId: args.fileId });
    return null;
  },
});

export const cacheDocument = internalAction({
  args: { sourceId: v.id('sources') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.runQuery(internal.documents.pending, args);
    if (!source || source.cached || !isPdf(source.url, source.title)) return null;
    const url = publicUrl(source.url);
    if (!url) return null;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/pdf,*/*' },
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) return null;
      if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('pdf')) return null;
      if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) return null;
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return null;
      const fileId = await ctx.storage.store(new Blob([bytes], { type: 'application/pdf' }));
      await ctx.runMutation(internal.documents.attach, { sourceId: args.sourceId, fileId });
    } catch {
      // A source that will not hand over its file still has a reader view and a link.
    }
    return null;
  },
});

export const viewer = query({
  args: { sourceId: v.id('sources') },
  returns: v.union(
    v.object({
      url: v.string(),
      title: v.string(),
      authority: v.string(),
      kind: sourceKind,
      kindLabel: v.string(),
      text: v.string(),
      retrievedAt: v.number(),
      fileUrl: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return null;
    await requireProject(ctx, source.projectId);
    const kind = source.kind ?? classifySource(source.url, source.title);
    return {
      url: source.url,
      title: source.title,
      authority: source.authority,
      kind,
      kindLabel: sourceKindLabels[kind],
      text: source.text,
      retrievedAt: source.retrievedAt,
      // Served from our own origin so the browser will actually render it.
      fileUrl: source.fileId ? `${env.CONVEX_SITE_URL}/document?id=${source.fileId}` : null,
    };
  },
});

/** Resolves an evidence URL back to the stored source that backs it. */
export const forUrl = query({
  args: { projectId: v.id('projects'), url: v.string() },
  returns: v.union(v.id('sources'), v.null()),
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const source = await ctx.db
      .query('sources')
      .withIndex('by_projectId_and_url', (q) =>
        q.eq('projectId', args.projectId).eq('url', args.url),
      )
      .unique();
    return source?._id ?? null;
  },
});
