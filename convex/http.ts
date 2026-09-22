import { httpRouter } from 'convex/server';
import { httpAction, env } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { components, internal } from './_generated/api';
import { registerStaticRoutes } from '@convex-dev/static-hosting';
import { verifySignature } from './integrations/agentmail';
import { z } from 'zod';

const http = httpRouter();
const envelope = z.object({
  event_type: z.string(),
  event_id: z.string().max(200),
  message: z.object({ inbox_id: z.string().max(300), message_id: z.string().max(500) }).optional(),
});
http.route({
  path: '/webhooks/agentmail',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (!env.AGENTMAIL_WEBHOOK_SECRET || !env.AGENTMAIL_INBOX_ID)
      return new Response('Mail integration not configured', { status: 503 });
    if (Number(request.headers.get('content-length') ?? 0) > 1_100_000)
      return new Response('Payload too large', { status: 413 });
    const body = await request.text();
    if (body.length > 1_100_000) return new Response('Payload too large', { status: 413 });
    if (!(await verifySignature(body, request.headers, env.AGENTMAIL_WEBHOOK_SECRET)))
      return new Response('Invalid signature', { status: 401 });
    let payload: z.infer<typeof envelope>;
    try {
      payload = envelope.parse(JSON.parse(body));
    } catch {
      return new Response('Invalid event', { status: 400 });
    }
    if (
      payload.event_type !== 'message.received' ||
      !payload.message ||
      payload.message.inbox_id !== env.AGENTMAIL_INBOX_ID
    )
      return new Response('Ignored', { status: 200 });
    await ctx.runMutation(internal.mailData.receipt, {
      eventId: payload.event_id,
      inboxId: payload.message.inbox_id,
      messageId: payload.message.message_id,
    });
    return new Response('Accepted', { status: 200 });
  }),
});
/**
 * Serves a cached official PDF from this deployment so it can be embedded next
 * to the claim it supports. The file is a public government document that was
 * fetched from a public URL, and the storage ID is unguessable, so this route
 * is deliberately unauthenticated — an iframe cannot carry a session token.
 */
http.route({
  path: '/document',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 200) return new Response('Not found', { status: 404 });
    let file: Blob | null;
    try {
      file = await ctx.storage.get(id as Id<'_storage'>);
    } catch {
      return new Response('Not found', { status: 404 });
    }
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(file, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }),
});
registerStaticRoutes(http, components.staticHosting);
export default http;
