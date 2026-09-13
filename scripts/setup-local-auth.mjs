import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Invoke Node directly: the alpha wizard uses spawnSync('npx'), which fails on Windows.
// Key material stays in memory and captured child-process I/O; never print it.
const cli = 'node_modules/convex/bin/main.js';
function run(args) {
  try {
    return execFileSync(process.execPath, [cli, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error('Local Convex operation failed. Confirm npm run dev:backend is running.');
  }
}
if (!process.argv.includes('--local'))
  throw new Error('Use --local to confirm this targets the local development backend.');
const url = run(['env', 'get', 'CONVEX_SITE_URL']);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url))
  throw new Error('Refusing to configure a non-local deployment.');
let existing = false;
try {
  existing = Boolean(run(['env', 'get', 'AUTH_PRIVATE_KEY']) && run(['env', 'get', 'AUTH_JWKS']));
} catch {
  /* first setup */
}
if (!existing) {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const key = Buffer.from(await exportPKCS8(privateKey)).toString('base64');
  const jwks = JSON.stringify({
    keys: [{ ...(await exportJWK(publicKey)), kid: randomUUID(), alg: 'RS256', use: 'sig' }],
  });
  run(['env', 'set', `AUTH_PRIVATE_KEY=${key}`]);
  run(['env', 'set', `AUTH_JWKS=${jwks}`]);
}
run(['env', 'set', 'GROUNDWORK_FIXTURES=true']);
console.log(
  'Local Auth v2 signing settings verified. Local provider fixtures enabled. No secret values displayed.',
);
