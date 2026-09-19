#!/usr/bin/env node
/**
 * Record the On Me demo.
 *
 * Drives the running app through one deterministic pass and produces:
 *   demo-out/video/*.webm   — the screen recording
 *   demo-out/beats.json     — beat name -> {startMs, endMs, narration}
 *   public/demo/NN-*.png    — stills of each beat
 *
 * The beats manifest is the handoff to narration: each entry carries the line to
 * speak and the window it has to land in, so a voice track can be generated and
 * muxed without anyone re-timing the video by hand.
 *
 * Usage:  pnpm seed && pnpm start &   then   pnpm demo
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(process.cwd(), 'demo-out');
const STILLS = path.join(process.cwd(), 'public', 'demo');
const VIEWPORT = { width: 1440, height: 900 };

/** Playwright in this image may not match the bundled browser revision. */
const EXECUTABLES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    for (const executablePath of EXECUTABLES) {
      if (executablePath && existsSync(executablePath)) {
        console.log(`[demo] falling back to ${executablePath}`);
        return await chromium.launch({ executablePath });
      }
    }
    throw err;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(STILLS, { recursive: true });

  const browser = await launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: path.join(OUT, 'video'), size: VIEWPORT },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });

  const t0 = Date.now();
  const beats = [];
  const page = await context.newPage();

  /** Mark a narration beat and hold the frame long enough to say the line. */
  const beat = async (name, narration, holdMs = 0, still = null) => {
    const startMs = Date.now() - t0;
    if (still) await page.screenshot({ path: path.join(STILLS, `${still}.png`) });
    if (holdMs) await sleep(holdMs);
    beats.push({ name, narration, startMs, endMs: Date.now() - t0 });
    console.log(`[beat] ${String(startMs).padStart(6)}ms  ${name}`);
  };

  // --- Act 0: the map ------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await beat(
    'map',
    'Right now, across New York, there are seven dinners already paid for, waiting for whoever needs them.',
    5200,
    '01-map',
  );

  await page.evaluate(() => document.querySelector('#map')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(1900);
  await beat(
    'counters',
    'Every glowing pin is a real restaurant on the Blackbird network, holding a meal that someone else already covered.',
    5000,
    '02-counters',
  );

  // --- Act 1: leaving one for a stranger ----------------------------------
  await page.goto(`${BASE}/leave`, { waitUntil: 'networkidle' });
  await sleep(900);
  await beat('leave-open', 'Leaving one takes about fifteen seconds. You pick a place you love.', 3200, '03-leave');

  await page.selectOption('select', { index: 1 });
  // Stay on "For anyone" — the stranger case is act one.
  await page.click('button.tab:has-text("For anyone")');
  await page.click('button.tab:has-text("$25")');
  await page.fill(
    'textarea',
    'I got laid off in March and a stranger did this for me. Your turn.',
  );
  await page.fill('input[placeholder="Anonymous"]', 'Nina');
  await sleep(700);
  await beat('leave-note', 'You say something to a person you will never meet.', 3400, '04-note');

  await page.click('button[type="submit"]');
  // Surface a validation error instead of dying on an opaque selector timeout.
  const outcome = await Promise.race([
    page.waitForSelector('text=It is waiting', { timeout: 15000 }).then(() => 'ok'),
    page.waitForSelector('p[style*="ff8a6b"]', { timeout: 15000 }).then(async el => {
      throw new Error(`form rejected: ${await el.textContent()}`);
    }),
  ]);
  if (outcome !== 'ok') throw new Error('unexpected form state');
  await sleep(1400);
  await beat(
    'escrowed',
    'The money goes into escrow. Nina cannot take it back. The restaurant cannot touch it. It is simply there.',
    5400,
    '05-escrowed',
  );

  // --- Act 2: the stranger claims -----------------------------------------
  await page.goto(`${BASE}/claim`, { waitUntil: 'networkidle' });
  await sleep(800);
  await page.selectOption('select', { index: 1 });
  await page.fill('input[placeholder="Ekow"]', 'Marcus');
  await sleep(600);
  await beat(
    'arrive',
    'Two days later, Marcus walks into the same restaurant. He does not have an account. He does not have to ask anyone for help.',
    5600,
    '06-arrive',
  );

  await page.click('button.btn:has-text("I am here")');
  await sleep(1000);
  await beat(
    'checkin',
    'He checks in on Blackbird, the way he already would. That check-in is the only key that opens the escrow.',
    4200,
    '07-checkin',
  );

  await page.waitForSelector('text=Dinner is covered', { timeout: 20000 });
  await sleep(1800);
  await beat(
    'reveal',
    'Dinner is covered.',
    3600,
    '08-reveal',
  );
  await sleep(200);
  await beat(
    'note-read',
    'And he reads what she wrote. Proof of presence released the payment — nobody had to verify that he deserved it.',
    5600,
    '09-note',
  );

  // --- Act 3: the wall ----------------------------------------------------
  await page.goto(`${BASE}/wall`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await beat(
    'wall',
    'This is the ledger of it. Not transactions — notes, between people who will never meet.',
    5200,
    '10-wall',
  );
  await page.evaluate(() => window.scrollBy({ top: 520, behavior: 'smooth' }));
  await sleep(2400);
  await beat(
    'close',
    'Suspended coffee has existed in Naples for a hundred years. It never scaled, because it needed a shopkeeper you could trust. On Me is that tradition with the trust problem solved.',
    7200,
    '11-close',
  );

  await context.close();
  await browser.close();

  // Playwright names videos by internal id; give it a predictable filename.
  const videoDir = path.join(OUT, 'video');
  const files = (await readdir(videoDir)).filter(f => f.endsWith('.webm'));
  if (files[0]) await rename(path.join(videoDir, files[0]), path.join(videoDir, 'on-me-demo.webm'));

  const manifest = {
    recordedAt: new Date().toISOString(),
    base: BASE,
    viewport: VIEWPORT,
    video: 'demo-out/video/on-me-demo.webm',
    totalMs: beats.at(-1)?.endMs ?? 0,
    beats,
  };
  await writeFile(path.join(OUT, 'beats.json'), JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(OUT, 'narration.txt'),
    beats.map(b => b.narration).join('\n\n'),
    'utf8',
  );

  console.log(`\n[demo] ${beats.length} beats, ${(manifest.totalMs / 1000).toFixed(1)}s`);
  console.log('[demo] video    -> demo-out/video/on-me-demo.webm');
  console.log('[demo] beats    -> demo-out/beats.json');
  console.log('[demo] narration-> demo-out/narration.txt');
  console.log('[demo] stills   -> public/demo/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
