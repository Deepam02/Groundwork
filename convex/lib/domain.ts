import type { Infer } from 'convex/values';
import type { requirement, source, mailChange } from './validators';
import {
  searchDomain,
  rejectedHost,
  isActionablePage,
  documentLinkLabel,
  classifySource,
} from './sources';

export {
  searchDomain,
  rejectedHost,
  isHomepage,
  isPdf,
  classifySource,
  sourceKindLabels,
  isActionablePage,
  isSpecificDocument,
  guidePages,
  officialChoices,
  documentScore,
  documentLinkLabel,
  pageName,
  trimPageChrome,
  documentQuery,
  candidatesForStep,
  rankDocuments,
  bestDocument,
  rejectionReason,
} from './sources';
export type { SourceKind } from './sources';

export type RequirementInput = Infer<typeof requirement>;
export type SourceInput = Infer<typeof source>;
export type MailChange = Infer<typeof mailChange>;

/** Input is newest first; keep the latest version of each clarified fact. */
export function latestByKey<T extends { key: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });
}

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a valid email address.');
  return email;
}

export function publicUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.includes('.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost') ||
      host.endsWith('.test') ||
      host.includes(':') ||
      /^\d+[.\d]*$/.test(host)
    )
      return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

/**
 * A later search may only be constrained to hosts the discovery pass actually
 * returned, so a hallucinated authority domain cannot widen the evidence set.
 */
export function admittedHosts(proposed: string[], candidateUrls: string[]): string[] {
  const found = new Set(candidateUrls.flatMap((url) => searchDomain(url) ?? []));
  return [...new Set(proposed.flatMap((host) => searchDomain(host) ?? []))]
    .filter((host) => found.has(host))
    .slice(0, 5);
}

/**
 * The official-source gate. Selection is a model judgement, so it is enforced
 * here before anything is read: an accurate consultant page is still not
 * evidence. Returning fewer sources is correct; padding with unofficial ones is not.
 */
export function officialPages<T extends { official: boolean }>(pages: T[]): T[] {
  return pages.filter((page) => page.official);
}

/** Each form keeps its own query. Two different permits from one office are not one search. */
export function shareAuthorityQueries<T extends { authority: string; query: string }>(
  steps: T[],
): T[] {
  return steps.map((step) => ({ ...step, query: step.query.trim() }));
}

export function authorityQueries<T extends { key: string; authority: string; query: string }>(
  steps: T[],
  limit = 8,
): { query: string; authority: string; keys: string[] }[] {
  const groups = new Map<string, { query: string; authority: string; keys: string[] }>();
  for (const step of steps) {
    const query = step.query.trim();
    const id = query || step.authority.trim().toLowerCase();
    const existing = groups.get(id);
    if (existing) {
      existing.keys.push(step.key);
      continue;
    }
    if (groups.size >= limit) continue;
    groups.set(id, { query, authority: step.authority, keys: [step.key] });
  }
  return [...groups.values()];
}

/** A sentence copied from the official page, preferring one that names the step. */
export function supportingSentence(text: string, hints: string[]): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim().slice(0, 700))
    .filter((sentence) => sentence.length >= 12);
  const needles = hints.map((hint) => hint.trim().toLowerCase()).filter((hint) => hint.length > 3);
  return (
    sentences.find((sentence) => needles.some((hint) => sentence.toLowerCase().includes(hint))) ??
    sentences[0] ??
    null
  );
}

/** A model asked for coverage areas sometimes echoes the step key instead. */
export function readableArea(value: string): string {
  const text = value.trim().slice(0, 120);
  if (!/^[a-z0-9]+([-_][a-z0-9]+)+$/.test(text)) return text;
  const words = text.split(/[-_]+/);
  return [words[0][0].toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ');
}

export function citedAction(nextAction: string, evidence: { url: string }[]): string {
  if (evidence.some((item) => isActionablePage(item.url))) return nextAction;
  const url = evidence[0]?.url;
  if (!url) return nextAction;
  return `${documentLinkLabel(url)}. The application page or form is still missing.`;
}

export function isBudgetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Research budget reached');
}

/** Resume from what is already stored so a follow-up answer does not repeat the map. */
export function nextInvestigationPhase(input: {
  location: string;
  activity: string;
  profilePending: boolean;
  mapped: boolean;
}): 'profile' | 'map' | 'confirm' {
  if (!input.location.trim() || !input.activity.trim() || input.profilePending) return 'profile';
  if (!input.mapped) return 'map';
  return 'confirm';
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** Unsupported fields cannot become confirmed just because an LLM emitted JSON. */
export function validateEvidence(
  input: RequirementInput,
  sources: SourceInput[],
): RequirementInput {
  const supported = input.evidence.filter((e) => {
    const source = sources.find((s) => s.url === e.url && s.official);
    return (
      source && e.excerpt.length >= 12 && normalize(source.text).includes(normalize(e.excerpt))
    );
  });
  const has = (field: string) => supported.some((e) => e.field === field);
  const confirmed = has('applicability');
  // An apply link is a claim like any other: it only survives if the model
  // chose a stored official page, not a plausible-looking URL it composed.
  const applyUrl =
    input.applyUrl &&
    sources.some(
      (s) => s.url === input.applyUrl && s.official && classifySource(s.url, s.title) !== 'lead',
    ) &&
    !rejectedHost(input.applyUrl)
      ? input.applyUrl
      : null;
  return {
    ...input,
    evidence: supported,
    applyUrl,
    applicability: confirmed ? input.applicability : 'needs_verification',
    reason: confirmed
      ? input.reason
      : 'We found a possible requirement, but the official evidence needs checking. ' +
        input.reason,
    fee: has('fee') ? input.fee : null,
    duration: has('duration') ? input.duration : null,
    documents: has('documents') ? input.documents : [],
    prerequisites: has('prerequisites')
      ? input.prerequisites.filter((key) => key !== input.key)
      : [],
  };
}

export function orderRequirements<T extends { key: string; prerequisites: string[] }>(
  rows: T[],
): { ordered: T[]; cycle: boolean } {
  const map = new Map(rows.map((row) => [row.key, row]));
  const ordered: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  let cycle = false;
  function visit(row: T) {
    if (visited.has(row.key)) return;
    if (visiting.has(row.key)) {
      cycle = true;
      return;
    }
    visiting.add(row.key);
    for (const key of row.prerequisites) {
      const dependency = map.get(key);
      if (dependency) visit(dependency);
    }
    visiting.delete(row.key);
    visited.add(row.key);
    ordered.push(row);
  }
  rows.forEach(visit);
  return { ordered, cycle };
}

export function validateMailChanges(changes: MailChange[], text: string): MailChange[] {
  return changes.map((change) => ({
    ...change,
    date: change.date && normalize(text).includes(normalize(change.date)) ? change.date : null,
    certain:
      change.certain &&
      change.excerpt.length >= 12 &&
      normalize(text).includes(normalize(change.excerpt)),
  }));
}
