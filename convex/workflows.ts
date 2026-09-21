import { v } from 'convex/values';
import { internal } from './_generated/api';
import { workflow } from './lib/workflow';
import { officialPages } from './lib/domain';
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
      const state = data.run.refined ? 'refining' : 'researching';
      let discovery: string[];
      const mailFollowup = data.run.trigger.startsWith('mail:');
      if (mailFollowup) {
        discovery = [data.run.trigger.slice(5)];
      } else if (data.run.refined) {
        discovery = [
          `${data.project.location} ${data.project.activity} government authority licence permit registration ${data.questions.map((q) => q.answer ?? '').join(' ')}`,
        ];
      } else {
        const result = await step.runAction(internal.inference.interpret, args);
        await step.runMutation(internal.research.initialize, { ...args, result });
        if (result.missing) return null;
        // Two discovery queries leave budget for the constrained evidence passes.
        discovery = result.queries.slice(0, 2);
      }
      async function runSearch(query: string, includeDomains?: string[]) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const wait = await step.runMutation(internal.research.reserve, {
            ...args,
            kind: 'searches',
          });
          if (wait) await step.sleep(wait);
          try {
            return await step.runAction(internal.inference.search, {
              ...args,
              query,
              includeDomains,
            });
          } catch {
            if (attempt === 1) throw new Error('Search could not finish.');
            await step.sleep(8000);
          }
        }
        return [];
      }
      await step.runMutation(internal.research.setStage, {
        ...args,
        stage: 'Finding the right authorities',
        state,
      });
      let candidates: Infer<typeof candidate>[] = [];
      for (const query of discovery) candidates.push(...(await runSearch(query)));
      if (!mailFollowup) {
        // Discovery may surface blogs and consultants. They are read for
        // vocabulary and the responsible body's name, then dropped: evidence is
        // collected only from the authority hosts they revealed.
        const authorities = await step.runAction(internal.inference.resolveAuthorities, {
          ...args,
          candidates,
        });
        if (!authorities.hosts.length) {
          await step.runMutation(internal.research.fail, {
            ...args,
            message:
              'No responsible public authority could be identified for this project, so nothing was read. Groundwork does not cite blogs or consultants in its place. Add the city, region and country, or name the department you expect, then run it again.',
          });
          return null;
        }
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: `Checking ${authorities.hosts[0]}`,
          state,
        });
        candidates = [];
        for (const query of authorities.queries.length ? authorities.queries : discovery)
          candidates.push(...(await runSearch(query, authorities.hosts)));
      }
      candidates = [...new Map(candidates.map((c) => [c.url, c])).values()].slice(0, 15);
      // The selector is a model judgement, so the gate is enforced here too.
      const pages = candidates.length
        ? officialPages(await step.runAction(internal.inference.select, { ...args, candidates }))
        : [];
      if (!pages.length) {
        await step.runMutation(internal.research.fail, {
          ...args,
          message:
            'No official source could be confirmed for this project in this pass, so no requirement was cited. Unofficial pages were not used. Try again with more detail about the location and activity.',
        });
        return null;
      }
      let read = 0;
      let publishedPreview = false;
      for (const page of pages.slice(0, mailFollowup ? 2 : data.run.refined ? 3 : 5)) {
        if (data.sources.some((s) => s.url === page.url)) continue;
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: `Reading ${page.authority}`,
          state,
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
        // A mail follow-up has budget for one synthesis only.
        if (read === 2 && !data.run.refined && !mailFollowup && !publishedPreview) {
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
