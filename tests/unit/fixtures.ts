import type { RequirementInput } from '../../convex/lib/domain';

export const requirement: RequirementInput = {
  key: 'planning',
  title: 'Planning review',
  authority: 'Example authority',
  kind: 'Permit',
  applicability: 'required',
  reason: 'A change of use requires review.',
  nextAction: 'Ask the planning authority.',
  documents: ['Floor plan'],
  fee: '100',
  duration: '2 weeks',
  prerequisites: ['planning'],
  evidence: [
    {
      url: 'https://example.org/planning',
      excerpt: 'A change of use requires a planning review.',
      field: 'applicability',
    },
  ],
};
