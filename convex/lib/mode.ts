import { env } from '../_generated/server';

export function fixturesEnabled() {
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(env.CONVEX_SITE_URL);
  if (env.GROUNDWORK_FIXTURES === 'true' && !local)
    throw new Error('Development fixtures are prohibited on cloud deployments.');
  return local && env.GROUNDWORK_FIXTURES === 'true';
}
