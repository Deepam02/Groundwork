import type { Infer } from 'convex/values';
import type { requirement, source, mailChange } from './validators';

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

/** Firecrawl's domain filters take bare hostnames, not URLs. */
export function searchDomain(raw: string): string | null {
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^[^/@]*@/, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/^www\./, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
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

const NON_AUTHORITY_HOSTS = [
  'reddit.com',
  'facebook.com',
  'fb.com',
  'fb.watch',
  'medium.com',
  'youtube.com',
  'youtu.be',
  'quora.com',
  'substack.com',
  'linkedin.com',
  'instagram.com',
  'tiktok.com',
  'wikipedia.org',
  'wordpress.com',
  'blogspot.com',
  'tumblr.com',
  'pinterest.com',
  'x.com',
  'twitter.com',
];
const UNREADABLE_HOSTS = [
  'facebook.com',
  'fb.com',
  'fb.watch',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'tiktok.com',
  'pinterest.com',
];

function hostIs(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Forums and publishers are leads, never the official page for a step. */
export function rejectedHost(url: string): boolean {
  const host = searchDomain(url);
  if (!host) return true;
  return NON_AUTHORITY_HOSTS.some((domain) => hostIs(host, domain));
}

/** Local accounts worth reading. Video and social posts usually return nothing useful. */
export function guidePages<T extends { url: string }>(candidates: T[], limit = 3): T[] {
  const seen = new Set<string>();
  const pages: T[] = [];
  for (const candidate of candidates) {
    const host = searchDomain(candidate.url);
    if (!host || UNREADABLE_HOSTS.some((domain) => hostIs(host, domain))) continue;
    if (seen.has(host)) continue;
    seen.add(host);
    pages.push(candidate);
    if (pages.length >= limit) break;
  }
  return pages;
}

/** A model may only keep a URL that this search actually returned, and not a known non-authority. */
export function officialChoices<T extends { url: string; official: boolean }>(
  pages: T[],
  allowedUrls: string[],
): T[] {
  const allowed = new Set(allowedUrls);
  return pages.filter(
    (page) => page.official && allowed.has(page.url) && !rejectedHost(page.url),
  );
}

/** Steps that name the same authority share one official search. */
export function shareAuthorityQueries<T extends { authority: string; query: string }>(
  steps: T[],
): T[] {
  const canonical = new Map<string, string>();
  return steps.map((step) => {
    const authority = step.authority.trim().toLowerCase();
    const query = canonical.get(authority) ?? step.query.trim();
    if (!canonical.has(authority)) canonical.set(authority, query);
    return { ...step, query };
  });
}

export function authorityQueries<T extends { key: string; authority: string; query: string }>(
  steps: T[],
  limit = 6,
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
  return {
    ...input,
    evidence: supported,
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
