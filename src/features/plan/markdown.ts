/**
 * Turning stored Firecrawl markdown back into something readable in-app, so an
 * excerpt can be shown in the context of the page it came from without sending
 * anyone off to a site that refuses to be framed.
 */
export type Block = { kind: 'heading' | 'list' | 'para'; text: string };

/** Firecrawl keeps link and emphasis syntax; a reader should never see it. */
export function clean(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\((?:https?:\/\/|\/)[^\s)]*\)/g, '')
    .replace(/(^|\s)#{1,6}(?=\s)/g, '$1')
    .replace(/\\([\\`*_[\]()#+\-.!])/g, '$1')
    .replace(/[*_`>{}]+/g, '')
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Flattened to readable prose. Links become their label and images are dropped:
 * this pane exists to show the wording a claim rests on, not to reproduce the page.
 */
export function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    const text = clean(paragraph.join(' '));
    if (text) blocks.push({ kind: 'para', text });
    paragraph = [];
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) continue;
    if (/^\s*!\[/.test(line)) continue;
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      const text = clean(heading[1]);
      if (text) blocks.push({ kind: 'heading', text });
      continue;
    }
    const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      const text = clean(item[1]);
      if (text) blocks.push({ kind: 'list', text });
      continue;
    }
    if (/^\s*[|:\- ]+$/.test(line)) continue;
    paragraph.push(line.trim());
  }
  flush();
  return blocks.slice(0, 400);
}

const CHROME =
  /^(skip to|search |advanced search|language switcher|menu|home|sign in|log in|cookie|accept all|share this|print this|back to top|breadcrumb)/i;

/**
 * Site navigation arrives as short list items before the real content. Drop
 * those, but only up to the first substantial passage, so nothing is lost.
 */
export function trimChrome(blocks: Block[]): Block[] {
  const first = blocks.findIndex((block) => block.text.length >= 120);
  if (first <= 0) return blocks;
  const head = blocks
    .slice(0, first)
    .filter((block) => !CHROME.test(block.text) && block.text.length > 24);
  return [...head, ...blocks.slice(first)];
}

/** The first block containing the cited sentence, split for highlighting. */
export function findExcerpt(blocks: Block[], excerpt?: string) {
  const needle = excerpt && clean(excerpt);
  if (!needle) return null;
  for (let index = 0; index < blocks.length; index++) {
    const parts = splitOnExcerpt(blocks[index].text, needle);
    if (parts) return { index, parts };
  }
  return null;
}

/** The excerpt is verbatim apart from whitespace, so match it the same way. */
function splitOnExcerpt(text: string, excerpt: string): [string, string, string] | null {
  const needle = excerpt.trim().slice(0, 400);
  if (needle.length < 12) return null;
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  let match: RegExpExecArray | null;
  try {
    match = new RegExp(pattern, 'i').exec(text);
  } catch {
    return null;
  }
  if (!match) return null;
  return [text.slice(0, match.index), match[0], text.slice(match.index + match[0].length)];
}
