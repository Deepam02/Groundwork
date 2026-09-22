import { WorkflowManager } from '@convex-dev/workflow';
import { components } from '../_generated/api';

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    // Steps within a run fan out; the Firecrawl token bucket, not this number,
    // is what keeps the provider inside its free-tier rate.
    maxParallelism: 3,
    retryActionsByDefault: false,
    defaultRetryBehavior: { maxAttempts: 2, initialBackoffMs: 8000, base: 2 },
  },
});
