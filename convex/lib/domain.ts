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
