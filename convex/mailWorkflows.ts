import { v } from 'convex/values';
import { workflow } from './lib/workflow';
import { internal } from './_generated/api';
import type { Infer } from 'convex/values';
import type { mailResult } from './lib/validators';

export const receive = workflow
  .define({ args: { inboxId: v.string(), messageId: v.string() }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    try {
      const message = await step.runAction(internal.mailActions.fetchMessage, args, {
        retry: { maxAttempts: 2, initialBackoffMs: 8000, base: 2 },
      });
      const messageId = await step.runMutation(internal.mailData.ingest, message);
      if (messageId) await step.runWorkflow(internal.mailWorkflows.process, { messageId });
    } catch {
      await step.runMutation(internal.mailData.receiptFailed, args);
    }
    return null;
  });
export const process = workflow
  .define({ args: { messageId: v.id('mailMessages') }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    const context = await step.runQuery(internal.mailData.context, args);
    if (!context || context.message.state !== 'processing') return null;
    let result: Infer<typeof mailResult>;
    try {
      result = await step.runAction(internal.mailActions.extract, args);
      await step.runMutation(internal.mailData.saveResult, { ...args, result });
    } catch {
      await step.runMutation(internal.mailData.fail, args);
      return null;
    }
    if (result.researchQuery) {
      try {
        await step.runMutation(internal.mailResearch.start, {
          messageId: args.messageId,
          query: result.researchQuery,
        });
      } catch {
        await step.runMutation(internal.mailResearch.deferred, { messageId: args.messageId });
      }
    }
    return null;
  });
