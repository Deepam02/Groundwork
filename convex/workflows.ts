import { v } from 'convex/values';
import { internal } from './_generated/api';
import { workflow } from './lib/workflow';
import {
  officialPages,
  guidePages,
  isBudgetError,
  nextInvestigationPhase,
  documentQuery,
  candidatesForStep,
  rankDocuments,
  isActionablePage,
  rejectedHost,
  rejectionReason,
  classifySource,
  sourceKindLabels,
} from './lib/domain';
import type { Infer } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { leadStep, question, officialPick, trailEntry, type candidate } from './lib/validators';

/** Steps are confirmed a few at a time; Firecrawl Free allows two browsers at once. */
const CONFIRM_BATCH = 3;

export const researchFlow = workflow
  .define({ args: { runId: v.id('researchRuns'), revision: v.number() }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    try {
      const data = await step.runQuery(internal.research.context, args);
      const state = data.run.refined ? 'refining' : 'researching';
      const mailFollowup = data.run.trigger.startsWith('mail:');

      async function trail(...entries: Infer<typeof trailEntry>[]) {
        return step.runMutation(internal.trail.append, { ...args, entries });
      }
      async function settle(
        ids: Id<'researchEvents'>[],
        verdict: 'accepted' | 'rejected' | 'failed',
        detail?: string,
      ) {
        const [eventId] = ids;
        if (eventId) await step.runMutation(internal.trail.settleEntry, { eventId, verdict, detail });
      }
      async function phase(label: string, stage: string) {
        await step.runMutation(internal.research.setStage, { ...args, stage, state });
        await trail({ kind: 'phase', label });
      }

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
          const logged = await trail({
            kind: 'search',
            label: query,
            verdict: 'running',
            detail: kind === 'guide' ? 'Looking for first-hand accounts' : 'Looking for the official page',
          });
          try {
            const hits = await step.runAction(internal.inference.search, { ...args, query, kind });
            await settle(
              logged,
              'accepted',
              `${hits.length} result${hits.length === 1 ? '' : 's'}`,
            );
            return { budget: false as const, hits };
          } catch {
            if (attempt === 1) {
              await settle(logged, 'failed', 'The search did not come back');
              return { budget: false as const, hits: [] };
            }
            await settle(logged, 'failed', 'Retrying');
            await step.sleep(8000);
          }
        }
        return { budget: false as const, hits: [] };
      }
      /** Show the reasoning that actually ran: which hosts the gates turned down. */
      async function logCandidates(hits: Infer<typeof candidate>[], stepKey?: string) {
        const entries: Infer<typeof trailEntry>[] = [];
        for (const hit of hits.slice(0, 5)) {
          // Only what is genuinely dropped here. Everything else goes to the
          // officiality review, which logs its own rejections with better reasons.
          if (!rejectedHost(hit.url)) continue;
          const reason = rejectionReason(hit.url, hit.title);
          if (!reason) continue;
          entries.push({
            kind: 'candidate',
            label: hit.title,
            url: hit.url,
            detail: reason,
            verdict: 'rejected',
            stepKey,
          });
        }
        if (entries.length) await trail(...entries.slice(0, 3));
      }
      async function finish(keepConfirmed: boolean) {
        await phase('Connecting the steps into one plan', 'Connecting the steps in your plan');
        try {
          const result = await step.runAction(internal.inference.synthesize, args);
          await step.runMutation(internal.research.applyResult, {
            ...args,
            result: keepConfirmed ? { ...result, questions: [] } : result,
            final: true,
            keepConfirmed,
          });
          if (result.gaps.length)
            await trail(
              ...result.gaps
                .slice(0, 3)
                .map((gap) => ({ kind: 'gap' as const, label: gap })),
            );
        } catch (error) {
          if (!isBudgetError(error)) throw error;
          await step.runMutation(internal.research.settle, args);
        }
      }

      if (mailFollowup) {
        await phase(
          'Checking this notice against public guidance',
          'Checking the notice against public guidance',
        );
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
      const phaseName = nextInvestigationPhase({
        location: data.project.location,
        activity: data.project.activity,
        profilePending,
        mapped,
      });
      let activityName = data.project.activity;
      let placeName = data.project.location;
      let guideQueries: string[] | null = null;
      if (phaseName === 'profile') {
        await phase('Reading your project', 'Understanding your project');
        const result = await step.runAction(internal.inference.interpret, args);
        await step.runMutation(internal.research.initialize, { ...args, result });
        if (result.plan) await trail({ kind: 'thought', label: result.plan });
        if (result.missing) {
          await trail({
            kind: 'thought',
            label: 'Pausing for one detail before searching',
            detail: result.missing,
          });
          return null;
        }
        activityName = result.activity;
        placeName = result.location;
        guideQueries = result.queries.slice(0, 3);
      }

      if (phaseName !== 'confirm') {
        await phase(
          'Reading how people actually did this',
          'Reading local accounts of this process',
        );
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
        const pages = budget ? [] : guidePages(candidates);
        // Reading the accounts is pure I/O, so they go out together.
        const waits = [];
        for (const page of pages) {
          const wait = await reserve('scrapes');
          if (wait === null) break;
          waits.push({ page, wait });
        }
        await Promise.all(
          waits.map(async ({ page, wait }) => {
            if (wait) await step.sleep(wait);
            const logged = await trail({
              kind: 'read',
              label: page.title,
              url: page.url,
              verdict: 'running',
              detail: 'Reading a first-hand account',
            });
            const source = await step.runAction(internal.inference.scrape, {
              ...args,
              page: { url: page.url, title: page.title, authority: page.title, official: false },
            });
            if (!source) {
              await settle(logged, 'failed', 'This page could not be read');
              return;
            }
            await settle(logged, 'accepted', `${source.text.length.toLocaleString()} characters`);
            await step.runMutation(internal.research.saveSource, {
              ...args,
              source: { ...source, official: false, kind: 'lead' },
            });
          }),
        );
        const guides = await step.runQuery(internal.research.context, args);
        if (!guides.sources.some((source) => !source.official)) {
          await step.runMutation(internal.research.fail, {
            ...args,
            message:
              'No local account described the steps for this project, so nothing was confirmed. Add the city and what you are doing, then try again.',
          });
          return null;
        }
        await phase('Listing the approvals people had to clear', 'Listing the steps people had to file');
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
        if (procedure?.steps.length)
          await trail(
            ...procedure.steps.slice(0, 8).map((lead) => ({
              kind: 'thought' as const,
              label: `Possible step: ${lead.title}`,
              detail: `${lead.authority} — ${lead.reason}`,
              stepKey: lead.key,
            })),
          );
        if (!published.count) {
          await step.runMutation(internal.research.fail, {
            ...args,
            message:
              'No local account described the steps for this project, so nothing was confirmed. Add the city and what you are doing, then try again.',
          });
          return null;
        }
        if (published.asked) {
          await trail({
            kind: 'thought',
            label: 'One answer decides several of these steps',
            detail: procedure?.question?.text,
          });
          return null;
        }
      }

      const current = await step.runQuery(internal.research.context, args);
      const pending = current.requirements.filter((row) => {
        if (row.stage === 'dismissed') return false;
        if (row.evidence.some((item) => isActionablePage(item.url))) return false;
        if (row.applicability === 'checking' || row.applicability === 'needs_verification')
          return true;
        return (
          row.applicability === 'required' && row.progress === 'not_started' && row.tasks.length === 0
        );
      });
      if (pending.length)
        await phase(
          'Confirming each step against the authority',
          'Checking each step against the official page',
        );

      type Lead = { row: (typeof pending)[number]; candidates: Infer<typeof candidate>[] };

      /** Search for the page that settles one step. Null means the run ran out of budget. */
      async function findCandidates(row: (typeof pending)[number]): Promise<Lead | null> {
        const lead = { title: row.title, authority: row.authority, query: row.leadQuery ?? '' };
        const place = current.project.location;
        const apply = await runSearch(documentQuery(lead, place, 'apply'), 'official');
        if (apply.budget) return null;
        let hits = apply.hits;
        let usable = rankDocuments(candidatesForStep(lead, hits), lead);
        if (!usable.length) {
          const again = await runSearch(documentQuery(lead, place, 'document'), 'official');
          if (again.budget) return null;
          hits = again.hits;
          usable = rankDocuments(candidatesForStep({ ...lead, query: row.title }, hits), lead);
        }
        await logCandidates(hits, row.key);
        return { row, candidates: usable.slice(0, 4) };
      }

      const leads: Lead[] = [];
      let exhausted = false;
      for (let index = 0; index < pending.length && !exhausted; index += CONFIRM_BATCH) {
        const found = await Promise.all(
          pending.slice(index, index + CONFIRM_BATCH).map(findCandidates),
        );
        for (const result of found) {
          if (!result) exhausted = true;
          else if (result.candidates.length) leads.push(result);
        }
      }

      // Ranking well is not the same as being published by the authority. One
      // judgement call over everything found keeps a consultant page that looks
      // like an application form out of the evidence.
      let picks: Infer<typeof officialPick>[] = [];
      if (leads.length) {
        const total = leads.reduce((count, lead) => count + lead.candidates.length, 0);
        await trail({
          kind: 'thought',
          label: `Checking which of ${total} pages are published by the authority itself`,
        });
        try {
          const review = await step.runAction(internal.inference.pickOfficial, {
            ...args,
            steps: leads.map(({ row }) => ({
              key: row.key,
              title: row.title,
              authority: row.authority,
              kind: row.kind,
              reason: row.reason.slice(0, 400),
              query: row.leadQuery ?? '',
            })),
            candidates: leads.flatMap((lead) => lead.candidates),
          });
          picks = review.picks;
          if (review.rejected.length)
            await trail(
              ...review.rejected.slice(0, 6).map((item) => ({
                kind: 'candidate' as const,
                label: item.title,
                url: item.url,
                detail: item.reason,
                verdict: 'rejected' as const,
              })),
            );
        } catch (error) {
          if (!isBudgetError(error)) throw error;
        }
        for (const { row } of leads)
          if (!picks.some((pick) => pick.key === row.key))
            await trail({
              kind: 'candidate',
              label: row.title,
              detail: `Nothing published by ${row.authority} could be confirmed`,
              verdict: 'rejected',
              stepKey: row.key,
            });
      }

      /** Read one confirmed page. Returns false once the run is out of budget. */
      async function readPick(pick: Infer<typeof officialPick>): Promise<boolean> {
        const row = leads.find((lead) => lead.row.key === pick.key)?.row;
        if (!row) return true;
        const wait = await reserve('scrapes');
        if (wait === null) return false;
        if (wait) await step.sleep(wait);
        const kind = pick.kind ?? classifySource(pick.url, pick.title);
        const logged = await trail({
          kind: 'read',
          label: pick.title,
          url: pick.url,
          detail: sourceKindLabels[kind],
          verdict: 'running',
          stepKey: pick.key,
        });
        const source = await step.runAction(internal.inference.scrape, {
          ...args,
          page: {
            url: pick.url,
            title: pick.title,
            authority: pick.authority || row.authority,
            official: true,
          },
        });
        if (!source) {
          // The page is the authority's own and we know where it is. Losing the
          // step because a portal blocks readers would throw away a right answer.
          await settle(logged, 'failed', 'Official page found, but it would not open to a reader');
          await step.runMutation(internal.research.attachUnread, {
            ...args,
            key: pick.key,
            url: pick.url,
            title: pick.title,
            authority: pick.authority || row.authority,
            kind,
          });
          await trail({
            kind: 'confirm',
            label: row.title,
            detail: `${pick.authority || row.authority} · link handed over, page unread`,
            url: pick.url,
            verdict: 'accepted',
            stepKey: pick.key,
          });
          return true;
        }
        await settle(logged, 'accepted', sourceKindLabels[kind]);
        await step.runMutation(internal.research.saveSource, {
          ...args,
          source: { ...source, official: true, kind },
        });
        await step.runMutation(internal.research.confirmLead, {
          ...args,
          key: pick.key,
          url: pick.url,
        });
        await trail({
          kind: 'confirm',
          label: row.title,
          detail: `${pick.authority || row.authority} · ${sourceKindLabels[kind]}`,
          url: pick.url,
          verdict: 'accepted',
          stepKey: pick.key,
        });
        return true;
      }

      for (let index = 0; index < picks.length && !exhausted; index += CONFIRM_BATCH) {
        const read = await Promise.all(picks.slice(index, index + CONFIRM_BATCH).map(readPick));
        if (read.some((ok) => !ok)) break;
      }
      await finish(true);
      await step.runMutation(internal.research.retireUnchecked, args);
      await trail({ kind: 'phase', label: 'Research complete' });
    } catch {
      await step.runMutation(internal.research.fail, {
        ...args,
        message:
          'Research could not finish. Check provider connections and remaining quota, then retry. Your existing findings are saved.',
      });
    }
    return null;
  });
