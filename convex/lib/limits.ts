import { RateLimiter, DAY, HOUR, MINUTE } from '@convex-dev/rate-limiter';
import { components } from '../_generated/api';

export const limits = new RateLimiter(components.rateLimiter, {
  projectRuns: { kind: 'fixed window', rate: 6, period: DAY },
  globalRuns: { kind: 'fixed window', rate: 20, period: DAY },
  mail: { kind: 'fixed window', rate: 20, period: DAY },
  connect: { kind: 'fixed window', rate: 5, period: HOUR },
  // Firecrawl Free documents 10 requests/minute. Capacity lets a run open with a
  // burst instead of pacing the first five calls 7.5s apart.
  firecrawl: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 5 },
});
