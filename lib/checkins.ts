import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SEED_CHECKINS, SEED_MEMBER } from './fixtures';
import { dataDir } from './store';
import type { CheckIn } from './types';

const checkinsFile = () => path.join(dataDir(), 'checkins.json');

/**
 * Check-ins recorded locally during a demo run.
 *
 * With Flynet OAuth configured, `listMyCheckIns` returns the member's real
 * check-ins and this file is not consulted for them. Without it, a demo still
 * needs a way to represent "the claimer has walked into the restaurant", and
 * these rows stand in for that. Anything sourced here is reported as seeded, so
 * the UI badges it rather than passing it off as a live visit.
 */
export async function readLocalCheckIns(): Promise<CheckIn[]> {
  try {
    return JSON.parse(await readFile(checkinsFile(), 'utf8')) as CheckIn[];
  } catch {
    return SEED_CHECKINS;
  }
}

export async function recordLocalCheckIn(locationId: string, userName: string): Promise<CheckIn> {
  const existing = await readLocalCheckIns();
  const checkIn: CheckIn = {
    id: `chk-local-${Date.now().toString(36)}`,
    locationId,
    userId: SEED_MEMBER.userId,
    userName,
    at: new Date().toISOString(),
  };
  await mkdir(dataDir(), { recursive: true });
  await writeFile(checkinsFile(), JSON.stringify([checkIn, ...existing], null, 2), 'utf8');
  return checkIn;
}
