import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type WorkspaceData = FunctionReturnType<typeof api.projects.workspace>;
export type Requirement = Doc<'requirements'>;
export type Question = Doc<'questions'>;
export const progressLabels: Record<Requirement['progress'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  scheduled: 'Scheduled',
  done: 'Done',
};
