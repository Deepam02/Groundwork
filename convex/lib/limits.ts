import { RateLimiter, DAY, HOUR, MINUTE } from '@convex-dev/rate-limiter';
import { components } from '../_generated/api';

export const limits = new RateLimiter(components.rateLimiter, {
  projectRuns: { kind: 'fixed window', rate: 6, period: DAY },
  globalRuns: { kind: 'fixed window', rate: 20, period: DAY },
  mail: { kind: 'fixed window', rate: 20, period: DAY },
  connect: { kind: 'fixed window', rate: 5, period: HOUR },
  firecrawl: { kind: 'token bucket', rate: 8, period: MINUTE, capacity: 1 },
});
