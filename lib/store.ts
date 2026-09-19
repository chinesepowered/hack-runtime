import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildSeedMeals } from './fixtures';
import type { Meal } from './types';

/**
 * Where demo state lives. Serverless hosts such as Vercel mount the app
 * read-only and allow writes only under /tmp, which is also per-instance and
 * ephemeral — so a deployment reseeds itself whenever it finds no data.
 */
export function dataDir(): string {
  return process.env.VERCEL ? '/tmp/on-me' : path.join(process.cwd(), '.data');
}

const mealsFile = () => path.join(dataDir(), 'meals.json');

/**
 * A JSON file is deliberately the whole persistence layer. The demo has to be
 * reproducible from a clean checkout with no database to provision, and
 * `pnpm seed` rewrites this file to a known state before a recording.
 *
 * Reads are intentionally uncached: `pnpm seed` can run against a live server
 * between takes, and a stale in-process copy would silently ignore it. A
 * missing file is seeded on first read, so neither a fresh clone nor a cold
 * serverless instance starts as an empty product.
 */
export async function readMeals(): Promise<Meal[]> {
  try {
    return JSON.parse(await readFile(mealsFile(), 'utf8')) as Meal[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    const seeded = buildSeedMeals();
    await writeMeals(seeded);
    return seeded;
  }
}

export async function writeMeals(meals: Meal[]): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(mealsFile(), JSON.stringify(meals, null, 2), 'utf8');
}

export async function addMeal(meal: Meal): Promise<Meal> {
  await writeMeals([meal, ...(await readMeals())]);
  return meal;
}

export async function updateMeal(id: string, patch: Partial<Meal>): Promise<Meal | null> {
  const meals = await readMeals();
  const idx = meals.findIndex(m => m.id === id);
  if (idx === -1) return null;
  meals[idx] = { ...meals[idx], ...patch };
  await writeMeals(meals);
  return meals[idx];
}
