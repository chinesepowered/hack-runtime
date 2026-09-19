import { NextResponse } from 'next/server';
import { recordLocalCheckIn } from '@/lib/checkins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stand in for a member walking into a restaurant and checking in on Blackbird.
 *
 * With Flynet OAuth configured the claim route reads the member's real check-ins
 * and ignores anything recorded here. This exists so the demo can show the
 * moment of arrival without asking a reviewer to physically go to dinner.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locationId?: string; userName?: string };
  if (!body.locationId) return NextResponse.json({ error: 'Which venue?' }, { status: 400 });
  const checkIn = await recordLocalCheckIn(body.locationId, (body.userName ?? 'Guest').slice(0, 40));
  return NextResponse.json({ checkIn, simulated: true }, { status: 201 });
}
