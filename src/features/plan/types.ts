import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type WorkspaceData = FunctionReturnType<typeof api.projects.workspace>;
export type Requirement = Doc<'requirements'>;
export type Question = Doc<'questions'>;
export type ResearchEvent = Doc<'researchEvents'>;

export const progressLabels: Record<Requirement['progress'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  scheduled: 'Scheduled',
  done: 'Done',
};

/** Rows written before steps tracked a stage were, by definition, confirmed ones. */
export const stageOf = (row: Requirement) => row.stage ?? 'confirmed';
export const isConfirmed = (row: Requirement) => stageOf(row) === 'confirmed';
export const isDismissed = (row: Requirement) => stageOf(row) === 'dismissed';

export const runningStates = ['queued', 'researching', 'refining'];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
