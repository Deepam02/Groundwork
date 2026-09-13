import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'convex/**/*.test.ts'],
    environment: 'edge-runtime',
    server: { deps: { inline: ['@convex-dev/rate-limiter'] } },
  },
});
