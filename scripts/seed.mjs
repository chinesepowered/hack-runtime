#!/usr/bin/env node
/**
 * Reset the demo to a known state.
 *
 * A recording has to be reproducible, so this rewrites .data/ from scratch:
 * a wall with some history on it, a set of meals still waiting, and no local
 * check-ins, so the claim sequence starts from "nobody has arrived yet".
 *
 * The data itself lives in lib/fixtures.ts and is shared with the app, which
 * seeds the same state on its own when it finds no data (e.g. on Vercel).
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { buildSeedMeals } from '../lib/fixtures.ts';

const DATA = path.join(process.cwd(), '.data');
const meals = buildSeedMeals();

await rm(DATA, { recursive: true, force: true });
await mkdir(DATA, { recursive: true });
await writeFile(path.join(DATA, 'meals.json'), JSON.stringify(meals, null, 2));
console.log(
  `seeded ${meals.length} meals (${meals.filter(m => m.status === 'waiting').length} waiting) -> .data/meals.json`,
);
