import type { CheckIn, Meal, Venue } from './types';

// Type-only imports keep this file loadable by plain Node (type stripping), so
// `scripts/seed.mjs` and the app share one copy of the demo data.

/**
 * Seeded venues shaped like Flynet staging `/locations` responses.
 *
 * The first entry uses the real staging identifiers published in the Flynet
 * quickstart so that a live run and a seeded run line up on the same venue.
 * Map coordinates are stylized, not real geography.
 */
export const SEED_VENUES: Venue[] = [
  {
    locationId: 'c54a3b6a-c31b-49b4-8af1-2dfb70ff3eec',
    restaurantId: '14339db3-2e7a-42c4-aa98-4c0fb18679eb',
    name: "Anton's",
    neighborhood: 'West Village',
    x: 378, y: 368,
    hours: 'Tue–Sun, 5:30pm–11pm',
  },
  { locationId: 'loc-seed-002', restaurantId: 'res-seed-002', name: 'Café Mogador', neighborhood: 'East Village', x: 392, y: 336, hours: 'Daily, 9am–midnight' },
  { locationId: 'loc-seed-003', restaurantId: 'res-seed-003', name: 'Sylvia’s Table', neighborhood: 'Harlem', x: 472, y: 120, hours: 'Wed–Sun, 11am–10pm' },
  { locationId: 'loc-seed-004', restaurantId: 'res-seed-004', name: 'Nom Wah', neighborhood: 'Chinatown', x: 352, y: 420, hours: 'Daily, 10:30am–9pm' },
  { locationId: 'loc-seed-005', restaurantId: 'res-seed-005', name: 'La Vara', neighborhood: 'Cobble Hill', x: 492, y: 494, hours: 'Thu–Sun, 5pm–10:30pm' },
  { locationId: 'loc-seed-006', restaurantId: 'res-seed-006', name: 'Roberta’s', neighborhood: 'Bushwick', x: 700, y: 400, hours: 'Daily, 11am–midnight' },
  { locationId: 'loc-seed-007', restaurantId: 'res-seed-007', name: 'Wu’s Wonton King', neighborhood: 'Two Bridges', x: 344, y: 445, hours: 'Daily, noon–10pm' },
  { locationId: 'loc-seed-008', restaurantId: 'res-seed-008', name: 'Casa Enrique', neighborhood: 'Long Island City', x: 600, y: 250, hours: 'Daily, 5pm–11pm' },
  { locationId: 'loc-seed-009', restaurantId: 'res-seed-009', name: 'Tanoreen', neighborhood: 'Bay Ridge', x: 452, y: 606, hours: 'Tue–Sun, noon–9pm' },
  { locationId: 'loc-seed-010', restaurantId: 'res-seed-010', name: 'Hometown Bar-B-Que', neighborhood: 'Red Hook', x: 452, y: 524, hours: 'Daily, noon–9pm' },
  { locationId: 'loc-seed-011', restaurantId: 'res-seed-011', name: 'Emily', neighborhood: 'Clinton Hill', x: 566, y: 452, hours: 'Daily, 5pm–11pm' },
  { locationId: 'loc-seed-012', restaurantId: 'res-seed-012', name: 'Rule of Thirds', neighborhood: 'Greenpoint', x: 612, y: 318, hours: 'Wed–Sun, 5:30pm–11pm' },
];

/** The staging member published in the Flynet quickstart. */
export const SEED_MEMBER = {
  userId: '13a014d0-31de-474b-89f9-d9a32b0d42b8',
  name: 'Ekow',
};

/**
 * A recent check-in for the seeded member at the seeded venue. This is what a
 * live `GET /users/me/check_ins` would return, and it is what releases escrow.
 */
export const SEED_CHECKINS: CheckIn[] = [
  {
    id: 'chk-seed-001',
    locationId: 'c54a3b6a-c31b-49b4-8af1-2dfb70ff3eec',
    userId: SEED_MEMBER.userId,
    userName: SEED_MEMBER.name,
    at: new Date().toISOString(),
  },
];

/** Notes seeded onto the wall so the first frame is not an empty product. */
export const SEED_MEALS: {
  venueIdx: number;
  amountCents: number;
  fromName: string;
  note: string;
  ageHours: number;
  claimedBy?: string;
}[] = [
  { venueIdx: 3, amountCents: 2400, fromName: 'Dara', note: 'My dad ate here every Sunday for thirty years. Order the shrimp dumplings.', ageHours: 19, claimedBy: 'Marisol' },
  { venueIdx: 5, amountCents: 3000, fromName: 'Theo', note: 'I got laid off in March and someone did this for me. Your turn.', ageHours: 7, claimedBy: 'James' },
  { venueIdx: 2, amountCents: 2600, fromName: 'Renata', note: 'For whoever is having the week I had.', ageHours: 31, claimedBy: 'Ada' },
  { venueIdx: 8, amountCents: 2200, fromName: 'Sam', note: 'Eat something green. Love you, whoever you are.', ageHours: 3 },
  { venueIdx: 6, amountCents: 1800, fromName: 'Kofi', note: 'Late shift? This one is for you.', ageHours: 12 },
  { venueIdx: 9, amountCents: 3400, fromName: 'Priya', note: 'Bring someone. It is better shared.', ageHours: 5 },
  { venueIdx: 11, amountCents: 2000, fromName: 'Iris', note: 'No conditions. Just dinner.', ageHours: 26 },
  { venueIdx: 4, amountCents: 2800, fromName: 'Hassan', note: 'For a nurse coming off a double.', ageHours: 9 },
  { venueIdx: 1, amountCents: 2500, fromName: 'Nadia', note: 'You made it through today. That counts.', ageHours: 2 },
  { venueIdx: 0, amountCents: 3200, fromName: 'Wes', note: 'Table for one is still a table. Enjoy it.', ageHours: 4 },
];

/** Deterministic placeholder hash (FNV-1a), so a reseed produces identical ids. */
function fakeTx(seed: string): string {
  let h = 2166136261n;
  for (const ch of seed) h = ((h ^ BigInt(ch.charCodeAt(0))) * 16777619n) & 0xffffffffn;
  return `0x${h.toString(16).padStart(8, '0').repeat(8).slice(0, 64)}`;
}

/**
 * The demo's starting state: a wall with some history on it and a set of meals
 * still waiting. Ages are relative to `now`, so a seed always looks recent.
 */
export function buildSeedMeals(now = Date.now()): Meal[] {
  return SEED_MEALS.map((row, i) => {
    const venue = SEED_VENUES[row.venueIdx];
    const createdAt = new Date(now - row.ageHours * 3_600_000).toISOString();
    const id = `meal_seed_${String(i).padStart(2, '0')}`;
    return {
      id,
      kind: 'open',
      locationId: venue.locationId,
      venueName: venue.name,
      neighborhood: venue.neighborhood,
      amountCents: row.amountCents,
      note: row.note,
      fromName: row.fromName,
      createdAt,
      status: row.claimedBy ? 'claimed' : 'waiting',
      claimedAt: row.claimedBy ? new Date(Date.parse(createdAt) + 2 * 3_600_000).toISOString() : undefined,
      claimedBy: row.claimedBy,
      fundingTx: fakeTx(`fund:${id}`),
      releaseTx: row.claimedBy ? fakeTx(`release:${id}`) : undefined,
      live: false,
    };
  });
}
