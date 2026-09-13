import { z } from 'zod';
import { env } from '../_generated/server';
import { providerJson } from './http';
import { publicUrl } from '../lib/domain';

const searchResponse = z.object({
  success: z.boolean(),
  data: z.object({
    web: z
      .array(
        z.object({
          url: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  }),
});
const scrapeResponse = z.object({
  success: z.boolean(),
  data: z
    .object({
      markdown: z.string().optional(),
      metadata: z
        .object({ title: z.string().optional(), sourceURL: z.string().optional() })
        .optional(),
    })
    .optional(),
});
export async function searchWeb(query: string) {
  if (!env.FIRECRAWL_API_KEY) throw new Error('Firecrawl is not connected yet.');
  const parsed = searchResponse.parse(
    await providerJson('https://api.firecrawl.dev/v2/search', env.FIRECRAWL_API_KEY, {
      method: 'POST',
      body: JSON.stringify({ query, limit: 5, sources: ['web'], timeout: 30000 }),
    }),
  );
  if (!parsed.success) throw new Error('Search did not complete.');
  return (parsed.data.web ?? []).flatMap((s) => {
    const url = publicUrl(s.url);
    return url
      ? [
          {
            url,
            title: s.title ?? new URL(url).hostname,
            description: (s.description ?? '').slice(0, 600),
          },
        ]
      : [];
  });
}
export async function scrapeWeb(url: string) {
  if (!publicUrl(url)) throw new Error('Only public HTTPS sources can be read.');
  if (!env.FIRECRAWL_API_KEY) throw new Error('Firecrawl is not connected yet.');
  const parsed = scrapeResponse.parse(
    await providerJson('https://api.firecrawl.dev/v2/scrape', env.FIRECRAWL_API_KEY, {
      method: 'POST',
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, timeout: 30000 }),
    }),
  );
  if (!parsed.success || !parsed.data?.markdown) throw new Error('This source could not be read.');
  return { text: parsed.data.markdown.slice(0, 9000), title: parsed.data.metadata?.title };
}
