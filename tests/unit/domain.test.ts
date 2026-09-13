// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  publicUrl,
  validateEvidence,
  orderRequirements,
  validateMailChanges,
  latestByKey,
} from '../../convex/lib/domain';
import { verifySignature } from '../../convex/integrations/agentmail';
import { requirement } from './fixtures';
import { fixtureResearch } from '../../convex/integrations/fixtures';

describe('evidence and public source boundaries', () => {
  it('uses the newest answer and leaves an uncertain fixture answer unresolved', () => {
    expect(
      latestByKey([
        { key: 'outdoor', answer: 'No' },
        { key: 'outdoor', answer: 'Yes' },
      ]),
    ).toEqual([{ key: 'outdoor', answer: 'No' }]);
    expect(
      fixtureResearch(true, 'Not sure yet').requirements.find((r) => r.key === 'outdoor')
        ?.applicability,
    ).toBe('needs_verification');
  });
  it('allows global HTTPS domains while refusing local/private URL forms', () => {
    expect(publicUrl('https://www.gov.br/servicos#item')).toBe('https://www.gov.br/servicos');
    expect(publicUrl('https://www.gov.ie/en/service/')).toBeTruthy();
    for (const url of [
      'http://example.com',
      'https://127.0.0.1',
      'https://[::1]',
      'https://localhost',
      'https://db.internal',
      'https://x:secret@example.org',
      'javascript:alert(1)',
      'https://example.org:8443',
    ])
      expect(publicUrl(url)).toBeNull();
  });
  it('does not equate a citation to evidence for every field', () => {
    const checked = validateEvidence(requirement, [
      {
        url: 'https://example.org/planning',
        title: 'Planning',
        authority: 'Example authority',
        text: requirement.evidence[0].excerpt,
        official: true,
      },
    ]);
    expect(checked.applicability).toBe('required');
    expect(checked.fee).toBeNull();
    expect(checked.duration).toBeNull();
    expect(checked.documents).toEqual([]);
    expect(checked.prerequisites).toEqual([]);
  });
  it('downgrades invented quotes and non-official sources', () => {
    expect(validateEvidence(requirement, []).applicability).toBe('needs_verification');
    expect(
      validateEvidence(requirement, [
        {
          url: requirement.evidence[0].url,
          title: 'A blog',
          authority: 'Blog',
          text: requirement.evidence[0].excerpt,
          official: false,
        },
      ]).evidence,
    ).toEqual([]);
  });
  it('orders dependencies and detects cycles without hanging', () => {
    const rows = [
      { key: 'b', prerequisites: ['a'] },
      { key: 'a', prerequisites: [] },
    ];
    expect(orderRequirements(rows).ordered.map((r) => r.key)).toEqual(['a', 'b']);
    expect(
      orderRequirements([
        { key: 'a', prerequisites: ['b'] },
        { key: 'b', prerequisites: ['a'] },
      ]).cycle,
    ).toBe(true);
  });
});
describe('incoming correspondence', () => {
  it('normalizes case without merging distinct plus or dotted addresses', () => {
    expect(normalizeEmail(' Test+demo@Example.ORG ')).toBe('test+demo@example.org');
    expect(normalizeEmail('first.last@example.org')).not.toBe(
      normalizeEmail('firstlast@example.org'),
    );
    expect(() => normalizeEmail('not an address')).toThrow();
  });
  it('keeps dates exactly as written and refuses invented dates or unsupported automatic changes', () => {
    const text = 'Your inspection is on September 22. Bring Form B.';
    const change = {
      requirementKey: 'safety',
      title: 'Inspection',
      tasks: ['Bring Form B'],
      date: 'September 22',
      progress: 'scheduled' as const,
      excerpt: text,
      certain: true,
    };
    expect(validateMailChanges([change], text)[0].date).toBe('September 22');
    const unsupported = validateMailChanges(
      [
        {
          ...change,
          date: '2026-09-22T10:00:00Z',
          excerpt: 'An invented notice that does not exist.',
        },
      ],
      text,
    )[0];
    expect(unsupported.date).toBeNull();
    expect(unsupported.certain).toBe(false);
  });
  it('verifies exact webhook bytes, rejects tampering, expiry and unsigned requests', async () => {
    const now = 1_800_000_000_000;
    const timestamp = String(now / 1000);
    const body = '{"event_type":"message.received"}';
    const keyBytes = new TextEncoder().encode('deterministic-test-webhook-material');
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const digest = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`test-event.${timestamp}.${body}`),
    );
    const headers = new Headers({
      'svix-id': 'test-event',
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${Buffer.from(digest).toString('base64')}`,
    });
    const secret = `whsec_${Buffer.from(keyBytes).toString('base64')}`;
    expect(await verifySignature(body, headers, secret, now)).toBe(true);
    expect(await verifySignature(body + ' ', headers, secret, now)).toBe(false);
    expect(await verifySignature(body, headers, secret, now + 301_000)).toBe(false);
    expect(await verifySignature(body, new Headers(), secret, now)).toBe(false);
  });
});
