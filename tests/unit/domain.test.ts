// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  publicUrl,
  validateEvidence,
  orderRequirements,
  validateMailChanges,
  admittedHosts,
  officialPages,
  latestByKey,
  rejectedHost,
  guidePages,
  authorityQueries,
  shareAuthorityQueries,
  supportingSentence,
  isBudgetError,
  nextInvestigationPhase,
  bestDocument,
  isHomepage,
  isSpecificDocument,
  isActionablePage,
  classifySource,
  documentScore,
  documentLinkLabel,
  pageName,
  trimPageChrome,
  rejectionReason,
  documentQuery,
  candidatesForStep,
} from '../../convex/lib/domain';
import { verifySignature } from '../../convex/integrations/agentmail';
import { requirement } from './fixtures';
import { fixtureResearch, fixtureProcedure, fixtureSources } from '../../convex/integrations/fixtures';

describe('official source admission', () => {
  const candidates = [
    'https://bbmp.gov.in/trade-licence',
    'https://www.fssai.gov.in/notification.pdf',
    'https://consultant-blog.example.com/how-to-open-a-cafe',
  ];
  it('reuses only the exact hosts discovery returned', () => {
    expect(
      admittedHosts(
        ['www.bbmp.gov.in', 'https://fssai.gov.in/forms', 'karnataka.gov.in', 'nonsense'],
        candidates,
      ),
    ).toEqual(['bbmp.gov.in', 'fssai.gov.in']);
    expect(admittedHosts(['consultant-blog.example.com'], candidates)).toEqual([
      'consultant-blog.example.com',
    ]);
    expect(admittedHosts(['bbmp.gov.in'], [])).toEqual([]);
  });
  it('rejects forums and publishers as official hosts and still reads a reddit lead', () => {
    expect(rejectedHost('https://www.reddit.com/r/smallbusiness/comments/1')).toBe(true);
    expect(rejectedHost('https://www.facebook.com/SF/posts/1')).toBe(true);
    expect(rejectedHost('https://bbmp.gov.in/trade-licence')).toBe(false);
    expect(
      guidePages([
        { url: 'https://www.facebook.com/city/posts/1' },
        { url: 'https://www.reddit.com/r/dublin/comments/1' },
        { url: 'https://www.reddit.com/r/dublin/comments/2' },
        { url: 'https://local-guide.example.com/cafe-permits' },
      ]).map((page) => page.url),
    ).toEqual([
      'https://www.reddit.com/r/dublin/comments/1',
      'https://local-guide.example.com/cafe-permits',
    ]);
  });
  it('keeps a separate search for each form and prefers the PDF over the home page', () => {
    expect(
      shareAuthorityQueries([
        { authority: 'Municipal corporation', query: 'trade licence application form' },
        { authority: 'Municipal corporation', query: 'health certificate notification pdf' },
      ]).map((step) => step.query),
    ).toEqual(['trade licence application form', 'health certificate notification pdf']);
    expect(
      authorityQueries(
        Array.from({ length: 8 }, (_, i) => ({
          key: `step-${i}`,
          authority: `Office ${i}`,
          query: `query ${i}`,
        })),
        6,
      ),
    ).toHaveLength(6);
    const home = {
      url: 'https://www.fssai.gov.in/',
      title: 'FSSAI',
      description: 'Food safety home',
    };
    const form = {
      url: 'https://foscos.fssai.gov.in/apply-for-foSCoS-license.pdf',
      title: 'FSSAI licence application form',
      description: 'Apply for the food safety licence',
    };
    expect(bestDocument([home, form])?.url).toBe(form.url);
    expect(
      bestDocument(
        [form, { url: 'https://dfs.delhi.gov.in/fire-safety-notification.pdf', title: 'Fire' }],
        { title: 'FSSAI licence', authority: 'Food Safety and Standards Authority', query: 'foscos' },
      )?.url,
    ).toBe(form.url);
    expect(isHomepage(home.url)).toBe(true);
    expect(isSpecificDocument(form.url, form.title)).toBe(true);
    expect(isSpecificDocument('https://example.com/blog/how-to-apply', 'How to apply')).toBe(false);
    // The first pass looks for somewhere to apply; only the retry chases a document.
    expect(
      documentQuery(
        { title: 'Trade licence', authority: 'SDMC', query: 'SDMC trade licence' },
        'South Delhi',
      ),
    ).toContain('apply online');
    expect(
      documentQuery(
        { title: 'Trade licence', authority: 'SDMC', query: 'SDMC trade licence' },
        'South Delhi',
        'document',
      ),
    ).toContain('application form');
    expect(
      candidatesForStep(
        { title: 'Fire clearance', authority: 'Delhi Fire Services', query: 'fire' },
        [form, { url: 'https://dfs.delhi.gov.in/fire-safety-notification.pdf', title: 'Fire' }],
      ).map((item) => item.url),
    ).toEqual(['https://dfs.delhi.gov.in/fire-safety-notification.pdf']);
    expect(
      nextInvestigationPhase({
        location: 'Dublin',
        activity: 'Café',
        profilePending: false,
        mapped: true,
      }),
    ).toBe('confirm');
    expect(
      nextInvestigationPhase({
        location: 'Dublin',
        activity: 'Café',
        profilePending: false,
        mapped: false,
      }),
    ).toBe('map');
    expect(
      nextInvestigationPhase({
        location: '',
        activity: 'Café',
        profilePending: false,
        mapped: false,
      }),
    ).toBe('profile');
    expect(isBudgetError(new Error('Research budget reached. Existing findings are saved.'))).toBe(
      true,
    );
    expect(
      supportingSentence('A blog mentioned it. The planning office requires a review before work.', [
        'planning office',
      ]),
    ).toBe('The planning office requires a review before work.');
  });
  it('ranks a page you can apply on above the PDF that merely describes the rule', () => {
    const portal = {
      url: 'https://www.localgov.ie/en/service/apply-for-food-business-registration',
      title: 'Apply for food business registration',
      description: 'Start your application online.',
    };
    const formPdf = {
      url: 'https://www.localgov.ie/files/food-business-registration-form.pdf',
      title: 'Food business registration form',
      description: 'Downloadable application form',
    };
    const circular = {
      url: 'https://www.localgov.ie/files/circular-2011-food.pdf',
      title: 'Circular 14/2011 on food premises',
      description: 'Notification to local authorities',
    };
    expect(classifySource(portal.url, portal.title)).toBe('apply');
    expect(classifySource(formPdf.url, formPdf.title)).toBe('form');
    expect(classifySource(circular.url, circular.title)).toBe('notice');
    expect(classifySource('https://www.reddit.com/r/dublin/1', 'A thread')).toBe('lead');
    expect(documentScore(portal)).toBeGreaterThan(documentScore(formPdf));
    expect(documentScore(formPdf)).toBeGreaterThan(documentScore(circular));
    expect(bestDocument([circular, formPdf, portal])?.url).toBe(portal.url);
    // A service page with none of the old document words is now citable.
    expect(isActionablePage(portal.url, portal.title)).toBe(true);
    expect(isActionablePage('https://www.localgov.ie/en/news/new-food-rules', 'New food rules')).toBe(
      false,
    );
    expect(rejectionReason('https://www.reddit.com/r/dublin/1')).toBe(
      'Forum or publisher, not an authority',
    );
    expect(rejectionReason('https://www.localgov.ie/')).toBe(
      'Department home page, not the application',
    );
    expect(rejectionReason(portal.url, portal.title)).toBeNull();
    expect(documentLinkLabel(portal.url, portal.title)).toBe('Open the application page');
    expect(documentLinkLabel(formPdf.url, formPdf.title)).toBe('Open the form (PDF)');
  });
  it('turns away a firm that sells help with the filing, but never a government host', () => {
    expect(rejectedHost('https://www.kotak.bank.in/company-registration-online.html')).toBe(true);
    expect(rejectedHost('https://raagconsultants.co.in/mcd-trade-license')).toBe(true);
    expect(rejectedHost('https://www.indiafilings.com/fssai-registration')).toBe(true);
    // The words appear in the path, not the host, on the authority's own site.
    expect(rejectedHost('https://mcdonline.nic.in/services/legal/trade-licence')).toBe(false);
    expect(rejectedHost('https://www.dublincity.ie/residential/fire-safety')).toBe(false);
    // A regulator named for what it regulates is still the regulator.
    expect(rejectedHost('https://www.centralbank.ie/regulation/authorisation')).toBe(false);
  });
  it('searches for the step rather than pasting back a URL the model suggested', () => {
    const step = {
      title: 'Business insurance',
      authority: 'Central Bank of Ireland',
      query: 'https://www.centralbank.ie/consumers/insurance/business-insurance',
    };
    const query = documentQuery(step, 'Dublin, Ireland');
    expect(query).not.toContain('https://');
    expect(query).toContain('Central Bank of Ireland');
    expect(query).toContain('Business insurance');
  });
  it('reads a page by its own name and skips the navigation above its content', () => {
    expect(pageName('Apply for a Street Furniture Licence | Dublin City Council')).toBe(
      'Apply for a Street Furniture Licence',
    );
    expect(pageName('Registering for tax - Revenue')).toBe('Registering for tax');
    // Nothing worth stripping, and nothing that leaves a stub behind.
    expect(pageName('Trade licence')).toBe('Trade licence');
    expect(pageName('FAQ | Dublin City Council')).toBe('FAQ | Dublin City Council');

    const body = `The council issues a street furniture licence to any café that places tables and chairs on the public footpath outside its premises.`;
    const page = [
      'Skip to main content',
      '[Search](/search) [Advanced Search](/advanced)',
      '## Quick Links',
      '## Services and Information',
      '# Apply for a Street Furniture Licence',
      body,
      body,
      body,
    ].join('\n');
    const trimmed = trimPageChrome(page);
    expect(trimmed.startsWith('# Apply for a Street Furniture Licence')).toBe(true);
    expect(trimmed).not.toContain('Skip to main content');
    expect(trimmed).not.toContain('Quick Links');
    // A page that is mostly navigation is left alone rather than gutted.
    expect(trimPageChrome('Skip to main content\n## Quick Links\n[Home](/)')).toBe(
      'Skip to main content\n## Quick Links\n[Home](/)',
    );
  });
  it('only trusts an apply link that points at a stored official source', () => {
    const sources = [
      {
        url: 'https://www.localgov.ie/en/service/apply-for-registration',
        title: 'Apply for registration',
        authority: 'Local authority',
        text: requirement.evidence[0].excerpt,
        official: true,
      },
    ];
    expect(
      validateEvidence({ ...requirement, applyUrl: sources[0].url }, sources).applyUrl,
    ).toBe(sources[0].url);
    expect(
      validateEvidence({ ...requirement, applyUrl: 'https://www.localgov.ie/invented' }, sources)
        .applyUrl,
    ).toBeNull();
  });
  it('matches each fixture step to its own application form', () => {
    const hits = fixtureSources.map((source) => ({
      url: source.url,
      title: source.title,
      description: source.text,
    }));
    for (const step of fixtureProcedure('').steps) {
      expect(bestDocument(candidatesForStep(step, hits), step)?.url).toContain(
        step.key === 'outdoor' ? 'outdoor' : step.key,
      );
    }
  });
  it('drops unofficial pages before the scrape loop instead of padding the set', () => {
    const pages = [
      { url: candidates[0], official: true },
      { url: candidates[2], official: false },
      { url: candidates[1], official: true },
    ];
    expect(officialPages(pages).map((p) => p.url)).toEqual([candidates[0], candidates[1]]);
    expect(officialPages([{ url: candidates[2], official: false }])).toEqual([]);
  });
});

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
