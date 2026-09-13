import { ConvexError } from 'convex/values';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  // Auth v2's sole configured issuer supplies the application users ID as subject.
  const id = identity && ctx.db.normalizeId('users', identity.subject);
  const user = id && (await ctx.db.get(id));
  if (!user) throw new ConvexError('Please sign in to continue.');
  return user;
}
export async function requireProject(ctx: QueryCtx | MutationCtx, id: Id<'projects'>) {
  const user = await requireUser(ctx);
  const project = await ctx.db.get(id);
  if (!project || project.ownerId !== user._id) throw new ConvexError('Project not found.');
  return project;
}
