import { v } from 'convex/values';
import { internal } from './_generated/api';
import { workflow } from './lib/workflow';
import type { Infer } from 'convex/values';
import type { candidate } from './lib/validators';

export const researchFlow = workflow
  .define({ args: { runId: v.id('researchRuns'), revision: v.number() }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    try {
      const data = await step.runQuery(internal.research.context, args);
      await step.runMutation(internal.research.setStage, {
        ...args,
        stage: 'Understanding your project',
        state: data.run.refined ? 'refining' : 'researching',
      });
      let queries: string[];
      const mailFollowup = data.run.trigger.startsWith('mail:');
      if (mailFollowup) {
        queries = [data.run.trigger.slice(5)];
      } else if (data.run.refined) {
        queries = [
          `${data.project.location} ${data.project.activity} official requirements ${data.questions.map((q) => q.answer ?? '').join(' ')}`,
        ];
      } else {
        const result = await step.runAction(internal.inference.interpret, args);
        await step.runMutation(internal.research.initialize, { ...args, result });
        if (result.missing) return null;
        queries = result.queries.slice(0, 3);
      }
      let candidates: Infer<typeof candidate>[] = [];
      for (const query of queries) {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Finding the right authorities',
          state: data.run.refined ? 'refining' : 'researching',
        });
        for (let attempt = 0; attempt < 2; attempt++) {
          const wait = await step.runMutation(internal.research.reserve, {
            ...args,
            kind: 'searches',
          });
          if (wait) await step.sleep(wait);
          try {
            candidates.push(
              ...(await step.runAction(internal.inference.search, { ...args, query })),
            );
            break;
          } catch {
            if (attempt === 1) throw new Error('Search could not finish.');
            await step.sleep(8000);
          }
        }
      }
      candidates = [...new Map(candidates.map((c) => [c.url, c])).values()].slice(0, 15);
      const pages = mailFollowup
        ? candidates.slice(0, 2).map((c) => ({
            url: c.url,
            title: c.title,
            authority: new URL(c.url).hostname,
            official: false,
          }))
        : await step.runAction(internal.inference.select, { ...args, candidates });
      let read = 0;
      let publishedPreview = false;
      for (const page of pages.slice(0, mailFollowup ? 2 : data.run.refined ? 3 : 5)) {
        if (data.sources.some((s) => s.url === page.url)) continue;
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: `Reading ${page.authority}`,
          state: data.run.refined ? 'refining' : 'researching',
        });
        const wait = await step.runMutation(internal.research.reserve, {
          ...args,
          kind: 'scrapes',
        });
        if (wait) await step.sleep(wait);
        const source = await step.runAction(internal.inference.scrape, { ...args, page });
        if (source) {
          await step.runMutation(internal.research.saveSource, { ...args, source });
          read++;
        }
        if (read === 2 && !data.run.refined && !publishedPreview) {
          const result = await step.runAction(internal.inference.synthesize, args);
          await step.runMutation(internal.research.applyResult, { ...args, result, final: false });
          publishedPreview = true;
        }
      }
      await step.runMutation(internal.research.setStage, {
        ...args,
        stage: 'Connecting the steps in your plan',
        state: data.run.refined ? 'refining' : 'researching',
      });
      const result = await step.runAction(internal.inference.synthesize, args);
      await step.runMutation(internal.research.applyResult, { ...args, result, final: true });
    } catch {
      // Do not persist raw provider errors: they may include request data or headers.
      await step.runMutation(internal.research.fail, {
        ...args,
        message:
          'Research could not finish. Check provider connections and remaining quota, then retry. Your existing findings are saved.',
      });
    }
    return null;
  });
