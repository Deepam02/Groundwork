/**
 * How a candidate page is judged before anything is read or cited.
 *
 * The ordering principle: a person needs somewhere to apply, not something to
 * read. An official online application or service page outranks a downloadable
 * form, which outranks a notification or circular. PDFs still carry binding
 * detail and remain valid evidence, but they are the fallback, not the target.
 */

export type SourceKind = 'apply' | 'form' | 'notice' | 'guidance' | 'lead';

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

/**
 * Firms that sell help with a filing rank well for it and describe it fluently,
 * so they read as authoritative. The business they are in is named in the host.
 */
const COMMERCIAL_TRADE =
  /(consultan|advisor|associates|solicitor|lawyer|attorney|accountant|filings|taxguru|cleartax|vakil|registrationwala|corpseed|legalservice)/i;
// A whole label, because a regulator is often named for what it regulates —
// centralbank.ie is the authority, kotak.bank.in sells to you.
const COMMERCIAL_LABEL = /(^|[.-])(bank|insurance|loans?|finserv|services?)([.-]|$)/i;

/** Forums, publishers, and vendors are leads, never the official page for a step. */
export function rejectedHost(url: string): boolean {
  const host = searchDomain(url);
  if (!host) return true;
  if (NON_AUTHORITY_HOSTS.some((domain) => hostIs(host, domain))) return true;
  // A government host may legitimately carry these words in a path; only the
  // hostname is judged, and a public-sector domain is never turned away.
  if (/(^|\.)(gov|nic|gob|gouv|govt|admin)(\.|$)/i.test(host)) return false;
  return COMMERCIAL_TRADE.test(host) || COMMERCIAL_LABEL.test(host);
}

export function isHomepage(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '').toLowerCase();
    return path === '' || path === '/index.html' || path === '/home' || path === '/en';
  } catch {
    return true;
  }
}

export function isPdf(url: string, title = ''): boolean {
  return /\.pdf(\?|#|$)/i.test(url) || /\bpdf\b/i.test(title);
}

const EDITORIAL = /\/blog\/|\/news\/|\/article\/|\/press-release|\/media-centre/i;
const APPLY_WORDS =
  /apply|application-form|e-?services?|eservice|onlineservice|online-service|portal|self-service|citizen|register|registration|licen[cs]ing|licen[cs]e|permit|book|submit|\/services?\/|how-to-apply|new-application/i;
const FORM_WORDS = /\bform\b|annexure|annex-|proforma|pro-forma|schedule-|template/i;
const NOTICE_WORDS = /notification|circular|gazette|\border\b|\bact\b|\brules?\b|regulation|amendment|bye-?laws?|statutory/i;

/**
 * `lead` means the host is not an authority at all. Everything else assumes the
 * caller already established official ownership, which is a separate gate.
 */
export function classifySource(url: string, title = '', description = ''): SourceKind {
  if (rejectedHost(url)) return 'lead';
  const blob = `${url} ${title} ${description}`.toLowerCase();
  const pdf = isPdf(url, title);
  if (!pdf && APPLY_WORDS.test(blob)) return 'apply';
  if (FORM_WORDS.test(blob)) return 'form';
  if (NOTICE_WORDS.test(blob)) return 'notice';
  if (pdf) return 'notice';
  if (APPLY_WORDS.test(blob)) return 'apply';
  return 'guidance';
}

export const sourceKindLabels: Record<SourceKind, string> = {
  apply: 'Apply online',
  form: 'Application form',
  notice: 'Official notice',
  guidance: 'Official guidance',
  lead: 'Local account',
};

/**
 * A citation has to be somewhere a person can act or something that states the
 * obligation — not a department landing page or a press release.
 */
export function isActionablePage(url: string, title = ''): boolean {
  if (rejectedHost(url) || isHomepage(url)) return false;
  const blob = `${url} ${title}`.toLowerCase();
  if (EDITORIAL.test(blob)) return false;
  if (APPLY_WORDS.test(blob) || FORM_WORDS.test(blob) || NOTICE_WORDS.test(blob)) return true;
  return /\.pdf|filing|fees?|checklist|eligibility|procedure|requirements|guidelines?/.test(blob);
}

/** Retained under the original name so existing callers and tests keep working. */
export const isSpecificDocument = isActionablePage;

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
  return pages.filter((page) => page.official && allowed.has(page.url) && !rejectedHost(page.url));
}

/** The place where "apply online" beats "here is a scanned 2011 circular". */
export function documentScore(candidate: {
  url: string;
  title?: string;
  description?: string;
}): number {
  if (rejectedHost(candidate.url)) return -100;
  const title = candidate.title ?? '';
  const blob = `${candidate.url} ${title} ${candidate.description ?? ''}`;
  const kind = classifySource(candidate.url, title, candidate.description ?? '');
  const pdf = isPdf(candidate.url, title);
  let score = kind === 'apply' ? 24 : kind === 'form' ? (pdf ? 8 : 14) : kind === 'notice' ? 3 : 2;
  if (isHomepage(candidate.url)) score -= 30;
  if (EDITORIAL.test(blob)) score -= 20;
  if (isActionablePage(candidate.url, title)) score += 4;
  return score;
}

/**
 * The name a person would read off the page, without the site's own branding.
 * "Apply for a Street Furniture Licence | Dublin City Council" is how a browser
 * tab reads; nobody says it out loud that way.
 */
export function pageName(title: string, url = ''): string {
  const full = title.trim();
  if (!full) return documentLinkLabel(url, title);
  const stripped = full.replace(/\s+[|–—·-]\s+[^|–—·]{2,60}$/, '').trim();
  return (stripped.length >= 8 ? stripped : full).slice(0, 120);
}

/**
 * Scraped markdown opens with whatever the site puts above its content: skip
 * links, search boxes, language switchers, quick-link menus. Left in, it is the
 * first thing a model sees and so ends up quoted as evidence. Cut back to the
 * heading that introduces the first real paragraph, and only when that leaves a
 * page worth reading.
 */
export function trimPageChrome(text: string): string {
  const whole = text.trim();
  const lines = whole.split('\n');
  const body = lines.findIndex(
    (line) => line.trim().length >= 120 && !line.trim().startsWith('['),
  );
  if (body <= 0 || body > 40) return whole;
  let start = body;
  for (let index = body - 1; index >= 0 && body - index <= 6; index--) {
    if (/^#{1,3}\s+\S/.test(lines[index].trim())) {
      start = index;
      break;
    }
  }
  const kept = lines.slice(start).join('\n').trim();
  return kept.length >= 400 ? kept : whole;
}

export function documentLinkLabel(url: string, title = ''): string {
  if (isHomepage(url)) return 'Department home, not the form';
  switch (classifySource(url, title)) {
    case 'apply':
      return 'Open the application page';
    case 'form':
      return isPdf(url, title) ? 'Open the form (PDF)' : 'Open the form';
    case 'notice':
      return isPdf(url, title) ? 'Open the notification (PDF)' : 'Open the notification';
    case 'lead':
      return 'Open the local account';
    default:
      return 'Open the official page';
  }
}

/**
 * Two passes. The first looks for somewhere to apply; only when that finds
 * nothing usable does the second fall back to the downloadable document.
 */
export function documentQuery(
  step: { title: string; authority: string; query: string },
  place: string,
  pass: 'apply' | 'document' = 'apply',
): string {
  // A model asked for a search sometimes hands back the URL it has in mind.
  // Pasted into a search box it reads as noise, so fall back to the step itself.
  // A step that hinges on the clarifying question sometimes carries that
  // question as its query, which searches for the question, not the permit.
  const asked = step.query.replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ').trim();
  const question =
    asked.includes('?') ||
    /^(do|does|did|will|would|are|is|can|could|should|have|has|what|which|how|when|where)\b/i.test(asked);
  const base = (
    asked.length >= 8 && !question ? asked : `${step.authority} ${step.title}`
  ).replace(/\s+/g, ' ');
  const located =
    place.trim() && !base.toLowerCase().includes(place.trim().toLowerCase())
      ? `${base} ${place.trim()}`
      : base;
  if (pass === 'document')
    return `${located} application form notification circular pdf`.replace(/\s+/g, ' ').slice(0, 300);
  // "Licence" names the thing; only an action word means the query already
  // points at the place you file it.
  if (/\bapply\b|\bonline\b|portal|e-?services?|registration|application/i.test(located))
    return located.slice(0, 300);
  return `${located} apply online official application`.replace(/\s+/g, ' ').slice(0, 300);
}

const genericDocumentWords = new Set([
  'form',
  'forms',
  'application',
  'applications',
  'notification',
  'notifications',
  'circular',
  'circulars',
  'gazette',
  'apply',
  'online',
  'official',
  'filing',
  'portal',
  'with',
  'from',
  'that',
  'this',
  'your',
  'have',
  'need',
  'needs',
]);

function documentTokens(step: { title: string; authority: string; query: string }): string[] {
  return `${step.authority} ${step.title} ${step.query}`
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3 && !genericDocumentWords.has(token));
}

function tokenHits(
  step: { title: string; authority: string; query: string },
  candidate: { url: string; title?: string; description?: string },
): number {
  const blob =
    `${candidate.url} ${candidate.title ?? ''} ${candidate.description ?? ''}`.toLowerCase();
  return documentTokens(step).filter((token) => blob.includes(token)).length;
}

export function candidatesForStep<T extends { url: string; title?: string; description?: string }>(
  step: { title: string; authority: string; query: string },
  candidates: T[],
): T[] {
  return candidates.filter((candidate) => tokenHits(step, candidate) > 0);
}

/** Prefer the page that lets this step be filed, then the form that states it. */
export function rankDocuments<T extends { url: string; title?: string; description?: string }>(
  candidates: T[],
  step?: { title: string; authority: string; query: string },
): T[] {
  // Ranking, not gatekeeping. A government portal often lives at a path that
  // looks like a landing page, and dropping it here would mean the officiality
  // review never sees the one page that actually settles the step. Scoring
  // pushes home pages and blogs down; `pickOfficial` makes the real call.
  return candidates
    .filter((candidate) => !rejectedHost(candidate.url))
    .map((candidate) => ({
      candidate,
      score: documentScore(candidate) + (step ? tokenHits(step, candidate) * 10 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);
}

export function bestDocument<T extends { url: string; title?: string; description?: string }>(
  candidates: T[],
  step?: { title: string; authority: string; query: string },
): T | null {
  return rankDocuments(candidates, step)[0] ?? null;
}

/** Why a candidate was discarded, in words a viewer can read off the screen. */
export function rejectionReason(url: string, title = ''): string | null {
  if (rejectedHost(url)) return 'Forum or publisher, not an authority';
  if (isHomepage(url)) return 'Department home page, not the application';
  if (EDITORIAL.test(`${url} ${title}`.toLowerCase())) return 'News or blog post, not guidance';
  if (!isActionablePage(url, title)) return 'No application, form, or notice on this page';
  return null;
}
