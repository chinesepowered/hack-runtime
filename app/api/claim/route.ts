import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { CHECKIN_FRESHNESS_MS, listMyCheckIns, listMyWallets, presenceAt } from '@/lib/flynet';
import { readLocalCheckIns } from '@/lib/checkins';
import { explorerUrl, releaseEscrow } from '@/lib/escrow';
import { readMeals, updateMeal } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Claim a suspended meal.
 *
 * The only thing that can release escrow is proof that the claimer is actually
 * in the restaurant, and the proof is a Flynet check-in at that location within
 * the freshness window. No check-in, no payout — that rule is the product.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mealId?: string;
    claimerName?: string;
    accessToken?: string;
  };
  const claimer = (body.claimerName ?? '').trim().slice(0, 40);
  if (!claimer) return NextResponse.json({ error: 'Who is claiming?' }, { status: 400 });

  const meal = (await readMeals()).find(m => m.id === body.mealId);
  if (!meal) return NextResponse.json({ error: 'No such meal.' }, { status: 404 });
  if (meal.status === 'claimed') {
    return NextResponse.json({ error: 'Someone already has this one.' }, { status: 409 });
  }
  if (meal.kind === 'named' && meal.toName?.toLowerCase() !== claimer.toLowerCase()) {
    return NextResponse.json({ error: `This one is being held for ${meal.toName}.` }, { status: 403 });
  }
  if (meal.kind === 'locked' && meal.unlocksAt && Date.parse(meal.unlocksAt) > Date.now()) {
    return NextResponse.json(
      { error: `Sealed until ${new Date(meal.unlocksAt).toLocaleDateString()}.` },
      { status: 403 },
    );
  }

  const { source, data: remote } = await listMyCheckIns(body.accessToken);
  const checkIns = source === 'live' ? remote : await readLocalCheckIns();
  const proof = presenceAt(checkIns, meal.locationId);
  if (!proof) {
    return NextResponse.json(
      {
        error: `No check-in at ${meal.venueName} in the last ${CHECKIN_FRESHNESS_MS / 3_600_000} hours.`,
        needsCheckIn: true,
      },
      { status: 409 },
    );
  }

  const { data: wallets } = await listMyWallets(body.accessToken);
  const settlement = await releaseEscrow(meal, claimer, wallets[0] as Hex | undefined);
  const updated = await updateMeal(meal.id, {
    status: 'claimed',
    claimedAt: new Date().toISOString(),
    claimedBy: claimer,
    releaseTx: settlement.txHash,
    live: settlement.live,
  });

  return NextResponse.json({
    meal: updated,
    settlement: { ...settlement, explorer: settlement.live ? explorerUrl(settlement.txHash) : null },
    proof,
    proofSource: source,
  });
}
