import { NextResponse } from 'next/server';
import { hasDiscoveryCreds, listVenues } from '@/lib/flynet';
import { addMeal, readMeals } from '@/lib/store';
import { escrowAddress, fundEscrow } from '@/lib/escrow';
import type { Meal, MealKind } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [{ source, data: venues }, meals] = await Promise.all([listVenues(), readMeals()]);
  const waiting = meals.filter(m => m.status === 'waiting');
  return NextResponse.json({
    source,
    flynetConfigured: hasDiscoveryCreds(),
    venues,
    meals,
    stats: {
      waiting: waiting.length,
      waitingCents: waiting.reduce((sum, m) => sum + m.amountCents, 0),
      claimed: meals.filter(m => m.status === 'claimed').length,
      neighborhoods: new Set(waiting.map(m => m.neighborhood)).size,
    },
  });
}

type Body = {
  locationId?: string;
  amountCents?: number;
  note?: string;
  fromName?: string;
  kind?: MealKind;
  toName?: string;
  unlocksAt?: string;
  parentId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const { data: venues } = await listVenues();
  const venue = venues.find(v => v.locationId === body.locationId);

  if (!venue) return NextResponse.json({ error: 'Unknown venue.' }, { status: 400 });
  const amountCents = Math.round(Number(body.amountCents ?? 0));
  if (!Number.isFinite(amountCents) || amountCents < 500 || amountCents > 50_000) {
    return NextResponse.json({ error: 'Amount must be between $5 and $500.' }, { status: 400 });
  }
  const kind: MealKind = body.kind === 'named' || body.kind === 'locked' ? body.kind : 'open';
  if (kind === 'named' && !body.toName?.trim()) {
    return NextResponse.json({ error: 'A named meal needs a recipient.' }, { status: 400 });
  }
  if (kind === 'locked' && !body.unlocksAt) {
    return NextResponse.json({ error: 'A locked meal needs an unlock date.' }, { status: 400 });
  }

  const id = `meal_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const settlement = await fundEscrow({ id, amountCents });

  const meal: Meal = {
    id,
    kind,
    locationId: venue.locationId,
    venueName: venue.name,
    neighborhood: venue.neighborhood,
    amountCents,
    note: (body.note ?? '').trim().slice(0, 240),
    fromName: (body.fromName ?? 'Anonymous').trim().slice(0, 40) || 'Anonymous',
    toName: kind === 'named' ? body.toName!.trim().slice(0, 40) : undefined,
    unlocksAt: kind === 'locked' ? body.unlocksAt : undefined,
    createdAt: new Date().toISOString(),
    status: 'waiting',
    fundingTx: settlement.txHash,
    parentId: body.parentId,
    live: settlement.live,
  };

  await addMeal(meal);
  return NextResponse.json({ meal, settlement, escrowAddress: escrowAddress() }, { status: 201 });
}
