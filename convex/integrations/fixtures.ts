import type { Infer } from 'convex/values';
import type { interpretation, procedure, researchResult, mailResult } from '../lib/validators';
import type { SourceInput } from '../lib/domain';

// Explicit local-only provider fixtures. These are synthetic, not legal guidance.
export function fixtureInterpret(description: string): Infer<typeof interpretation> {
  const match = description.match(/\bin\s+([^.!?]+)[.!?]?/i);
  const location = match?.[1]?.split(/,?\s+with\s+/i)[0]?.trim() ?? 'Your location';
  const activity = /café|cafe|coffee/i.test(description)
    ? 'Neighbourhood café'
    : /garage|renovat|convert/i.test(description)
      ? 'A space, reimagined'
      : 'Independent studio';
  return {
    title: activity,
    location,
    activity,
    queries: [
      `${location} ${activity} permit process reddit`,
      `${location} ${activity} what permits did you need`,
      `${location} ${activity} step by step application`,
    ],
    missing: match ? null : 'Which city and country is your project in?',
  };
}
export const fixtureGuides: SourceInput[] = [
  {
    url: 'https://example.org/groundwork-fixture/local-account',
    title: 'What I had to file for a small café',
    authority: 'A local account',
    official: false,
    text: 'SYNTHETIC DEVELOPMENT FIXTURE. A neighbour described the full procedure: a planning review, a business registration, a safety inspection, and a separate permission if furniture uses the public footpath.',
  },
];
export const fixtureSources: SourceInput[] = [
  {
    url: 'https://example.org/groundwork-fixture/planning-application-form',
    title: 'Planning your change of use',
    authority: 'Sample Planning Office',
    official: true,
    text: 'SYNTHETIC DEVELOPMENT FIXTURE. A change in the use of premises requires a planning review before work begins. Submit a floor plan and a description of the intended use. Confirm existing use with the planning office before requesting an inspection.',
  },
  {
    url: 'https://example.org/groundwork-fixture/registration-application-form',
    title: 'Registering a new local business',
    authority: 'Sample Business Registry',
    official: true,
    text: 'SYNTHETIC DEVELOPMENT FIXTURE. Register a new business before opening to the public. Provide the business name and the operating address.',
  },
  {
    url: 'https://example.org/groundwork-fixture/safety-application-form',
    title: 'Preparing for a premises inspection',
    authority: 'Sample Safety Office',
    official: true,
    text: 'SYNTHETIC DEVELOPMENT FIXTURE. Public-facing premises require a safety inspection before opening. Provide Form B and an electrical safety certificate. Confirm existing use with the planning office before requesting an inspection.',
  },
  {
    url: 'https://example.org/groundwork-fixture/outdoor-application-form',
    title: 'Using the public footpath',
    authority: 'Sample Public Realm Office',
    official: true,
    text: 'SYNTHETIC DEVELOPMENT FIXTURE. A separate permission is required for furniture placed on a public footpath. This permission does not apply when all furniture remains inside the premises.',
  },
];
export function fixtureProcedure(answer: string): Infer<typeof procedure> {
  const steps = [
    ['planning', 'Confirm the premises use', 'Planning', 'Sample Planning Office'],
    ['registration', 'Register your business', 'Registration', 'Sample Business Registry'],
    ['safety', 'Arrange a safety inspection', 'Inspection', 'Sample Safety Office'],
    ['outdoor', 'Check outdoor permission', 'Licence', 'Sample Public Realm Office'],
  ].map(([key, title, kind, authority]) => ({
    key,
    title,
    kind,
    authority,
    reason: `A local account mentioned ${title.toLowerCase()}.`,
    query: `${authority} ${title}`,
  }));
  const answered = /outdoor|footpath|indoors|inside|not sure|unsure/i.test(answer);
  return {
    steps,
    question: answered
      ? null
      : {
          key: 'outdoor',
          text: 'Will any part of your project use the public footpath?',
          reason: 'The public-space guidance treats outdoor furniture separately.',
          options: ['Yes, some outdoor space', 'No, everything is indoors', 'Not sure yet'],
        },
  };
}
export function fixtureResearch(refined: boolean, answer: string): Infer<typeof researchResult> {
  const noOutdoor = /\bno\b|inside|indoor/i.test(answer);
  const unknownOutdoor = /not sure|unsure|unknown/i.test(answer);
  const data = [
    [
      'planning',
      'Confirm the premises use',
      'Planning',
      'Ask the planning office to confirm the approved use of your space.',
      'A change in the use of premises requires a planning review before work begins.',
    ],
    [
      'registration',
      'Register your business',
      'Registration',
      'Prepare your business name and operating address.',
      'Register a new business before opening to the public.',
    ],
    [
      'safety',
      'Arrange a safety inspection',
      'Inspection',
      'Get your safety documents ready for the inspection.',
      'Public-facing premises require a safety inspection before opening.',
    ],
    [
      'outdoor',
      'Check outdoor permission',
      'Licence',
      'Confirm whether your plans extend onto a public footpath.',
      refined && noOutdoor
        ? 'This permission does not apply when all furniture remains inside the premises.'
        : 'A separate permission is required for furniture placed on a public footpath.',
    ],
  ];
  return {
    summary:
      'Start by confirming how your space can be used. Registration and your safety review follow from there.',
    checked: ['Premises use', 'Business registration', 'Safety & inspections', 'Public space'],
    gaps: ['Fees and processing times need confirmation with the relevant offices.'],
    questions: refined
      ? []
      : [
          {
            key: 'outdoor',
            text: 'Will any part of your project use the public footpath?',
            reason: 'The public-space guidance treats outdoor furniture separately.',
            options: ['Yes, some outdoor space', 'No, everything is indoors', 'Not sure yet'],
          },
        ],
    requirements: data.map(([key, title, kind, nextAction, excerpt], i) => ({
      key,
      title,
      kind,
      authority: fixtureSources[i].authority,
      applicability:
        key === 'outdoor' && refined && noOutdoor
          ? 'not_applicable'
          : key === 'outdoor' && (!refined || unknownOutdoor)
            ? 'needs_verification'
            : 'required',
      reason:
        key === 'outdoor' && refined && noOutdoor
          ? 'Your answer keeps the project entirely inside the premises.'
          : 'This sample source describes a step relevant to the project.',
      nextAction,
      documents: [],
      fee: null,
      duration: null,
      prerequisites: key === 'safety' ? ['planning'] : [],
      evidence: [
        { url: fixtureSources[i].url, field: 'applicability', excerpt },
        ...(key === 'safety'
          ? [
              {
                url: fixtureSources[i].url,
                field: 'prerequisites',
                excerpt:
                  'Confirm existing use with the planning office before requesting an inspection.',
              },
            ]
          : []),
      ],
    })),
  };
}
export const fixtureNotice =
  'Your safety inspection is scheduled for September 22. Please provide Form B and an electrical safety certificate.';
export const fixtureMail: Infer<typeof mailResult> = {
  summary: 'Inspection scheduled for September 22. Two preparation tasks added.',
  researchQuery: null,
  changes: [
    {
      requirementKey: 'safety',
      title: 'Safety inspection',
      tasks: ['Prepare Form B', 'Prepare electrical safety certificate'],
      date: 'September 22',
      progress: 'scheduled',
      excerpt: fixtureNotice,
      certain: true,
    },
  ],
};
