import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchWeb, scrapeWeb } from '../../convex/integrations/firecrawl';
import { getMail } from '../../convex/integrations/agentmail';
import { fixturesEnabled } from '../../convex/lib/mode';
import { providerJson } from '../../convex/integrations/http';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('provider adapters against documented response shapes', () => {
  it('parses Firecrawl v2 web results, excludes private URLs and requests no automatic scrape', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'unit-test-value');
    const request = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        data: {
          web: [
            { url: 'https://example.org/official', title: 'Official guidance' },
            { url: 'https://127.0.0.1/private' },
          ],
        },
      }),
    );
    vi.stubGlobal('fetch', request);
    const result = await searchWeb('activity country official requirements');
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.org/official');
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body.sources).toEqual(['web']);
    expect(body.scrapeOptions).toBeUndefined();
  });
  it('bounds ordinary scraped text and rejects a blocked or empty page', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'unit-test-value');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          data: { markdown: 'a'.repeat(12000), metadata: { title: 'Guidance' } },
        }),
      ),
    );
    expect((await scrapeWeb('https://example.org/guidance')).text).toHaveLength(9000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, data: {} })));
    await expect(scrapeWeb('https://example.org/blocked')).rejects.toThrow('could not be read');
  });
  it('reads canonical incoming mail, keeps attachment names only, and rejects spam', async () => {
    vi.stubEnv('AGENTMAIL_API_KEY', 'unit-test-value');
    const response = {
      inbox_id: 'test-inbox',
      message_id: 'test-message',
      from: 'Test Sender <sender@example.org>',
      subject: 'Notice',
      text: 'An inspection is scheduled for September 22.',
      attachments: [{ filename: 'notice.pdf', attachment_id: 'ignored' }],
      labels: ['received'],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)));
    const mail = await getMail('test-inbox', 'test-message');
    expect(mail.sender).toBe('sender@example.org');
    expect(mail.attachments).toEqual(['notice.pdf']);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...response, labels: ['spam'] })),
    );
    await expect(getMail('test-inbox', 'test-message')).rejects.toThrow('not an accepted');
  });
  it('never embeds raw response data in a provider error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('sensitive response details', { status: 429 })),
    );
    await expect(
      providerJson('https://api.firecrawl.dev/v2/search', 'unit-test-value'),
    ).rejects.toThrow('Firecrawl: usage limit reached.');
  });
  it('refuses cloud fixture mode and missing keys instead of fabricating live research', async () => {
    vi.stubEnv('CONVEX_SITE_URL', 'https://example.convex.site');
    vi.stubEnv('GROUNDWORK_FIXTURES', 'true');
    expect(fixturesEnabled).toThrow('prohibited');
    vi.stubEnv('GROUNDWORK_FIXTURES', 'false');
    expect(fixturesEnabled()).toBe(false);
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    await expect(searchWeb('test')).rejects.toThrow('not connected');
  });
});
