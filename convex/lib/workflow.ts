import { WorkflowManager } from '@convex-dev/workflow';
import { components } from '../_generated/api';

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 1,
    retryActionsByDefault: false,
    defaultRetryBehavior: { maxAttempts: 2, initialBackoffMs: 8000, base: 2 },
  },
});
