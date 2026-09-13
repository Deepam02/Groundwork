import { z } from 'zod';
import { env } from '../_generated/server';
import { providerJson } from './http';
import { normalizeEmail } from '../lib/domain';

const messageSchema = z.object({
  inbox_id: z.string(),
  message_id: z.string(),
  from: z.union([z.string(), z.array(z.string())]).optional(),
  from_: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
  extracted_text: z.string().optional(),
  labels: z.array(z.string()).optional(),
  attachments: z.array(z.object({ filename: z.string().optional() })).optional(),
});
export async function getMail(inboxId: string, messageId: string) {
  if (!env.AGENTMAIL_API_KEY) throw new Error('AgentMail is not connected.');
  const message = messageSchema.parse(
    await providerJson(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      env.AGENTMAIL_API_KEY,
    ),
  );
  if (
    message.inbox_id !== inboxId ||
    message.message_id !== messageId ||
    message.labels?.some((label) => ['spam', 'blocked', 'unauthenticated', 'sent'].includes(label))
  )
    throw new Error('Message is not an accepted incoming message.');
  const from = message.from ?? message.from_;
  const addresses = Array.isArray(from) ? from : from ? [from] : [];
  if (addresses.length !== 1)
    throw new Error('Message must have one authenticated forwarding sender.');
  const sender = normalizeEmail(addresses[0].match(/<([^<>]+)>/)?.[1] ?? addresses[0]);
  const text = message.text ?? message.extracted_text;
  if (!text) throw new Error('A text version of this message is needed.');
  return {
    inboxId,
    messageId,
    sender,
    subject: (message.subject ?? 'Forwarded correspondence').slice(0, 300),
    text: text.slice(0, 20000),
    attachments: (message.attachments ?? [])
      .slice(0, 12)
      .map((a) => (a.filename ?? 'Attachment').slice(0, 150)),
  };
}

/** Verify Svix's versioned HMAC against the exact raw bytes without Node-only imports. */
export async function verifySignature(
  body: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  try {
    const id = headers.get('svix-id');
    const timestamp = headers.get('svix-timestamp');
    const signatures = headers.get('svix-signature');
    if (
      !id ||
      !timestamp ||
      !signatures ||
      !/^\d+$/.test(timestamp) ||
      Math.abs(now / 1000 - Number(timestamp)) > 300
    )
      return false;
    const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const payload = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
    for (const signature of signatures.split(' ')) {
      const [version, digest] = signature.split(',');
      if (version !== 'v1' || !digest) continue;
      const bytes = Uint8Array.from(atob(digest), (c) => c.charCodeAt(0));
      if (await crypto.subtle.verify('HMAC', key, bytes, payload)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
