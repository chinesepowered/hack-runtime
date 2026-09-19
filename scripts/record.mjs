#!/usr/bin/env node
/**
 * One command to produce the demo: seed, serve, record, stop.
 *
 *   pnpm build && pnpm demo:record
 *
 * Kept separate from `pnpm demo` so a recording can also be driven against an
 * already-running dev server when iterating on the script.
 */
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = process.env.PORT ?? '3000';
const BASE = `http://localhost:${PORT}`;

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/meals`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await delay(500);
  }
  return false;
}

console.log('[record] seeding');
run('node', ['scripts/seed.mjs']);

console.log(`[record] starting server on :${PORT}`);
const server = spawn('node_modules/.bin/next', ['start', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
server.stderr.on('data', d => process.stderr.write(`[next] ${d}`));

const stop = () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already gone
  }
};
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

if (!(await waitForServer())) {
  console.error('[record] server did not come up — is the port already in use?');
  stop();
  process.exit(1);
}

console.log('[record] recording');
const demo = spawnSync('node', ['scripts/demo.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, DEMO_BASE_URL: BASE },
});

stop();
process.exit(demo.status ?? 0);
