import { z } from 'zod';

const text = z.string().max(1200);
const short = z.string().max(200);
export const interpretationSchema = z.object({
  title: short,
  location: short,
  activity: short,
  plan: text,
  queries: z.array(short).max(3),
  missing: text.nullable(),
});
export const authoritySchema = z.object({
  hosts: z.array(short).max(5),
  queries: z.array(short).max(3),
});
export const procedureSchema = z.object({
  steps: z
    .array(
      z.object({
        key: short,
        title: short,
        authority: short,
        kind: short,
        reason: text,
        query: short,
      }),
    )
    .max(8),
  question: z
    .object({ key: short, text, reason: text, options: z.array(short).max(4) })
    .nullable(),
});
export const sourceKindSchema = z.enum(['apply', 'form', 'notice', 'guidance', 'lead']);
export const officialPickSchema = z.object({
  pages: z
    .array(
      z.object({
        key: short,
        url: z.string(),
        title: short,
        authority: short,
        kind: sourceKindSchema,
        official: z.boolean(),
      }),
    )
    .max(8),
  rejected: z
    .array(z.object({ url: z.string(), title: short, reason: short }))
    .max(10),
});
export const selectionSchema = z.object({
  pages: z
    .array(
      z.object({
        url: z.string(),
        title: short,
        authority: short,
        official: z.boolean(),
        reason: text,
      }),
    )
    .max(5),
});
export const researchSchema = z.object({
  summary: text,
  checked: z.array(short).max(12),
  gaps: z.array(text).max(12),
  questions: z
    .array(z.object({ key: short, text, reason: text, options: z.array(short).max(4) }))
    .max(3),
  requirements: z
    .array(
      z.object({
        key: short,
        title: short,
        authority: short,
        kind: short,
        applicability: z.enum(['checking', 'required', 'not_applicable', 'needs_verification']),
        reason: text,
        nextAction: text,
        documents: z.array(short).max(8),
        fee: short.nullable(),
        duration: short.nullable(),
        applyUrl: z.string().nullable(),
        prerequisites: z.array(short).max(6),
        evidence: z
          .array(
            z.object({
              url: z.string(),
              excerpt: z.string().max(700),
              field: z.enum([
                'applicability',
                'documents',
                'fee',
                'duration',
                'prerequisites',
                'nextAction',
              ]),
            }),
          )
          .max(10),
      }),
    )
    .max(15),
});
export const mailSchema = z.object({
  summary: text,
  researchQuery: short.nullable(),
  changes: z
    .array(
      z.object({
        requirementKey: short,
        title: short,
        tasks: z.array(short).max(8),
        date: short.nullable(),
        progress: z.enum(['not_started', 'in_progress', 'submitted', 'scheduled', 'done']),
        excerpt: z.string().max(700),
        certain: z.boolean(),
      }),
    )
    .max(8),
});
