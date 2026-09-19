import { SEED_CHECKINS, SEED_MEMBER, SEED_VENUES } from './fixtures';
import type { CheckIn, DataSource, Venue } from './types';

const API_BASE = process.env.FLYNET_API_BASE ?? 'https://api.staging.blackbird.xyz/flynet/v1';
const API_KEY = process.env.FLYNET_API_KEY ?? '';

/**
 * Flynet's discovery routes take a server-to-server API key; member routes
 * (check-ins, profile) take an OAuth bearer token. Both credentials stay on the
 * server — nothing here is ever imported into a client component.
 */
export const hasDiscoveryCreds = (): boolean => API_KEY.length > 0;

export type Sourced<T> = { source: DataSource; data: T };

async function flynet<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: { 'X-API-Key': API_KEY, accept: 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Flynet ${pathname} -> ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

type FlynetLocation = {
  id: string;
  restaurant_id?: string;
  name?: string;
  neighborhood?: string;
  restaurant?: { id?: string; name?: string };
  address?: { neighborhood?: string; locality?: string };
};

/**
 * Venues that can hold a suspended meal.
 *
 * Live responses are mapped onto our `Venue` shape and given stylized map
 * coordinates borrowed from the seed set, because Flynet returns real addresses
 * and this map is an illustration rather than true geography.
 */
export async function listVenues(limit = 12): Promise<Sourced<Venue[]>> {
  if (!hasDiscoveryCreds()) return { source: 'seeded', data: SEED_VENUES.slice(0, limit) };
  try {
    const body = await flynet<{ data?: FlynetLocation[]; items?: FlynetLocation[] }>(
      `/locations?page=0&page_size=${limit}`,
    );
    const rows = body.data ?? body.items ?? [];
    if (rows.length === 0) return { source: 'seeded', data: SEED_VENUES.slice(0, limit) };
    const data = rows.map((row, i) => ({
      locationId: row.id,
      restaurantId: row.restaurant_id ?? row.restaurant?.id ?? row.id,
      name: row.restaurant?.name ?? row.name ?? 'Unnamed venue',
      neighborhood: row.neighborhood ?? row.address?.neighborhood ?? row.address?.locality ?? 'New York',
      x: SEED_VENUES[i % SEED_VENUES.length].x,
      y: SEED_VENUES[i % SEED_VENUES.length].y,
      hours: SEED_VENUES[i % SEED_VENUES.length].hours,
    }));
    return { source: 'live', data };
  } catch {
    // A demo must never hard-fail on a credential problem; fall back and say so.
    return { source: 'seeded', data: SEED_VENUES.slice(0, limit) };
  }
}

type FlynetCheckIn = {
  id: string;
  location_id?: string;
  location?: { id?: string };
  user_id?: string;
  user?: { id?: string; display_name?: string; first_name?: string };
  created_at?: string;
  checked_in_at?: string;
};

/**
 * The member's own recent check-ins — this is the oracle. A suspended meal is
 * released only when the claimer's presence at the venue is proven here, so the
 * escrow can never pay out to someone who is not in the restaurant.
 */
export async function listMyCheckIns(accessToken?: string): Promise<Sourced<CheckIn[]>> {
  if (!accessToken) return { source: 'seeded', data: SEED_CHECKINS };
  try {
    const res = await fetch(`${API_BASE}/users/me/check_ins?page=0&page_size=10`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data?: FlynetCheckIn[]; items?: FlynetCheckIn[] };
    const rows = body.data ?? body.items ?? [];
    const data = rows.map(row => ({
      id: row.id,
      locationId: row.location_id ?? row.location?.id ?? '',
      userId: row.user_id ?? row.user?.id ?? SEED_MEMBER.userId,
      userName: row.user?.display_name ?? row.user?.first_name ?? SEED_MEMBER.name,
      at: row.checked_in_at ?? row.created_at ?? new Date().toISOString(),
    }));
    return { source: 'live', data };
  } catch {
    return { source: 'seeded', data: SEED_CHECKINS };
  }
}

/** How recent a check-in must be to release a meal. */
export const CHECKIN_FRESHNESS_MS = 4 * 60 * 60 * 1000;

/** Find a check-in that proves presence at `locationId` right now. */
export function presenceAt(checkIns: CheckIn[], locationId: string, now = Date.now()): CheckIn | null {
  return (
    checkIns.find(c => c.locationId === locationId && now - Date.parse(c.at) <= CHECKIN_FRESHNESS_MS) ?? null
  );
}

/**
 * The member's Flynet wallets (`read:wallets`). Used as the release recipient so
 * escrow pays out to the wallet the member already holds in Blackbird.
 */
export async function listMyWallets(accessToken?: string): Promise<Sourced<string[]>> {
  if (!accessToken) return { source: 'seeded', data: [] };
  try {
    const res = await fetch(`${API_BASE}/users/me/wallets`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data?: { address?: string }[]; items?: { address?: string }[] };
    const rows = body.data ?? body.items ?? [];
    return { source: 'live', data: rows.map(r => r.address).filter((a): a is string => !!a) };
  } catch {
    return { source: 'seeded', data: [] };
  }
}
