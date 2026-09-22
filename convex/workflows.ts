import { v } from 'convex/values';
import { internal } from './_generated/api';
import { workflow } from './lib/workflow';
import {
  officialPages,
  guidePages,
  authorityQueries,
  isBudgetError,
  nextInvestigationPhase,
} from './lib/domain';
import type { Infer } from 'convex/values';
import { leadStep, question, type candidate } from './lib/validators';

export const researchFlow = workflow
  .define({ args: { runId: v.id('researchRuns'), revision: v.number() }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    try {
      const data = await step.runQuery(internal.research.context, args);
      const state = data.run.refined ? 'refining' : 'researching';
      const mailFollowup = data.run.trigger.startsWith('mail:');

      async function reserve(kind: 'searches' | 'scrapes' | 'modelCalls') {
        try {
          return await step.runMutation(internal.research.reserve, { ...args, kind });
        } catch (error) {
          if (isBudgetError(error)) return null;
          throw error;
        }
      }
      async function runSearch(query: string, kind: 'guide' | 'official') {
        for (let attempt = 0; attempt < 2; attempt++) {
          const wait = await reserve('searches');
          if (wait === null) return { budget: true as const, hits: [] as Infer<typeof candidate>[] };
          if (wait) await step.sleep(wait);
          try {
            const hits = await step.runAction(internal.inference.search, { ...args, query, kind });
            return { budget: false as const, hits };
          } catch {
            if (attempt === 1) return { budget: false as const, hits: [] };
            await step.sleep(8000);
          }
        }
        return { budget: false as const, hits: [] };
      }
      async function finish(keepConfirmed: boolean) {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Connecting the steps in your plan',
          state,
        });
        try {
          const result = await step.runAction(internal.inference.synthesize, args);
          await step.runMutation(internal.research.applyResult, {
            ...args,
            result: keepConfirmed ? { ...result, questions: [] } : result,
            final: true,
            keepConfirmed,
          });
        } catch (error) {
          if (!isBudgetError(error)) throw error;
          await step.runMutation(internal.research.settle, args);
        }
      }

      if (mailFollowup) {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Checking the notice against public guidance',
          state,
        });
        const found = await runSearch(data.run.trigger.slice(5), 'official');
        if (!found.budget && found.hits.length) {
          try {
            const pages = officialPages(
              await step.runAction(internal.inference.select, { ...args, candidates: found.hits }),
            );
            for (const page of pages.slice(0, 2)) {
              const wait = await reserve('scrapes');
              if (wait === null) break;
              if (wait) await step.sleep(wait);
              const source = await step.runAction(internal.inference.scrape, { ...args, page });
              if (source) await step.runMutation(internal.research.saveSource, { ...args, source });
            }
          } catch (error) {
            if (!isBudgetError(error)) throw error;
          }
        }
        await finish(false);
        return null;
      }

      const profilePending = data.questions.some(
        (question) => question.key === 'project-context' && question.answer === undefined,
      );
      const mapped =
        data.sources.some((source) => !source.official) ||
        data.requirements.some((row) => Boolean(row.leadQuery));
      const phase = nextInvestigationPhase({
        location: data.project.location,
        activity: data.project.activity,
        profilePending,
        mapped,
      });
      let activityName = data.project.activity;
      let placeName = data.project.location;
      let guideQueries: string[] | null = null;
      if (phase === 'profile') {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Understanding your project',
          state,
        });
        const result = await step.runAction(internal.inference.interpret, args);
        await step.runMutation(internal.research.initialize, { ...args, result });
        if (result.missing) return null;
        activityName = result.activity;
        placeName = result.location;
        guideQueries = result.queries.slice(0, 3);
      }

      if (phase !== 'confirm') {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Reading local accounts of this process',
          state,
        });
        const answers = data.questions.map((question) => question.answer ?? '').join(' ');
        const place = `${placeName} ${answers}`.trim();
        const fallback = [
          `${activityName} ${place} permit process reddit`,
          `${activityName} ${place} what permits did you need`,
          `${activityName} ${place} step by step licence application`,
        ];
        const queries = (guideQueries?.map((query) => query.trim()).filter(Boolean) ?? []).slice(
          0,
          3,
        );
        let budget = false;
        const candidates: Infer<typeof candidate>[] = [];
        for (const query of queries.length ? queries : fallback) {
          const found = await runSearch(query, 'guide');
          if (found.budget) {
            budget = true;
            break;
          }
          candidates.push(...found.hits);
        }
        for (const page of guidePages(candidates)) {
          if (budget) break;
          const wait = await reserve('scrapes');
          if (wait === null) {
            budget = true;
            break;
          }
          if (wait) await step.sleep(wait);
          const source = await step.runAction(internal.inference.scrape, {
            ...args,
            page: { url: page.url, title: page.title, authority: page.title, official: false },
          });
          if (source)
            await step.runMutation(internal.research.saveSource, {
              ...args,
              source: { ...source, official: false },
            });
        }
        const guides = await step.runQuery(internal.research.context, args);
        if (!guides.sources.some((source) => !source.official)) {
          await step.runMutation(internal.research.fail, {
            ...args,
            message:
              'No local account described the steps for this project, so nothing was confirmed. Add the city and what you are doing, then try again.',
          });
          return null;
        }
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: 'Listing the steps people had to file',
          state,
        });
        let procedure: {
          steps: Infer<typeof leadStep>[];
          question: Infer<typeof question> | null;
        } | null = null;
        try {
          procedure = await step.runAction(internal.inference.extractProcedure, args);
        } catch (error) {
          if (!isBudgetError(error)) throw error;
        }
        const published = procedure
          ? await step.runMutation(internal.research.publishLeads, {
              ...args,
              steps: procedure.steps,
              question: procedure.question,
            })
          : { asked: false, count: 0 };
        if (!published.count) {
          await step.runMutation(internal.research.fail, {
            ...args,
            message:
              'No local account described the steps for this project, so nothing was confirmed. Add the city and what you are doing, then try again.',
          });
          return null;
        }
        if (published.asked) return null;
      }

      const current = await step.runQuery(internal.research.context, args);
      const pending = current.requirements.filter(
        (row) => row.applicability === 'checking' && row.leadQuery,
      );
      const groups = authorityQueries(
        pending.flatMap((row) =>
          row.leadQuery
            ? [{ key: row.key, authority: row.authority, query: row.leadQuery }]
            : [],
        ),
      );
      let pool: Infer<typeof candidate>[] = [];
      for (const group of groups) {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: `Checking ${group.authority}`,
          state,
        });
        const found = await runSearch(group.query, 'official');
        if (found.budget) break;
        pool.push(...found.hits);
      }
      pool = [...new Map(pool.map((hit) => [hit.url, hit])).values()].slice(0, 40);
      let picks: { key: string; url: string; title: string; authority: string }[] = [];
      if (pool.length && pending.length) {
        try {
          picks = await step.runAction(internal.inference.pickOfficial, {
            ...args,
            steps: pending.flatMap((row) =>
              row.leadQuery
                ? [
                    {
                      key: row.key,
                      title: row.title,
                      authority: row.authority,
                      kind: row.kind,
                      reason: row.reason,
                      query: row.leadQuery,
                    },
                  ]
                : [],
            ),
            candidates: pool,
          });
        } catch (error) {
          if (!isBudgetError(error)) throw error;
        }
      }
      const scraped = new Set<string>();
      for (const pick of picks) {
        await step.runMutation(internal.research.setStage, {
          ...args,
          stage: `Reading ${pick.authority}`,
          state,
        });
        if (!scraped.has(pick.url)) {
          const wait = await reserve('scrapes');
          if (wait === null) break;
          if (wait) await step.sleep(wait);
          const source = await step.runAction(internal.inference.scrape, {
            ...args,
            page: {
              url: pick.url,
              title: pick.title,
              authority: pick.authority,
              official: true,
            },
          });
          if (source)
            await step.runMutation(internal.research.saveSource, {
              ...args,
              source: { ...source, official: true },
            });
          scraped.add(pick.url);
        }
        await step.runMutation(internal.research.confirmLead, {
          ...args,
          key: pick.key,
          url: pick.url,
        });
      }
      await finish(true);
    } catch {
      await step.runMutation(internal.research.fail, {
        ...args,
        message:
          'Research could not finish. Check provider connections and remaining quota, then retry. Your existing findings are saved.',
      });
    }
    return null;
  });
