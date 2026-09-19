'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TxBadge } from '@/components/Badge';
import type { Meal, Venue } from '@/lib/types';

type Stage = 'pick' | 'arriving' | 'searching' | 'releasing' | 'reveal' | 'empty';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ClaimPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState<Stage>('pick');
  const [claimed, setClaimed] = useState<{ meal: Meal; live: boolean; explorer?: string; note?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const res = await fetch('/api/meals');
    const body = (await res.json()) as { venues: Venue[]; meals: Meal[] };
    setVenues(body.venues);
    setMeals(body.meals);
    setLocationId(prev => prev || body.venues[0]?.locationId || '');
  }

  const venue = venues.find(v => v.locationId === locationId);
  const waitingHere = meals.filter(m => m.locationId === locationId && m.status === 'waiting');

  /**
   * The claim sequence deliberately shows its work: arriving, then checking in,
   * then the release. The check-in is what unlocks the money, so it gets its own
   * beat on screen rather than happening invisibly.
   */
  async function arrive() {
    setError('');
    setStage('arriving');

    // Stand in for the member checking in on Blackbird at this venue.
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locationId, userName: name || 'Guest' }),
    });
    await wait(900);

    setStage('searching');
    await wait(900);

    const target = waitingHere[0];
    if (!target) {
      setStage('empty');
      return;
    }

    // A live release is signed, broadcast and confirmed before this returns,
    // which takes seconds; show that it is happening rather than freezing.
    setStage('releasing');
    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mealId: target.id, claimerName: name || 'Guest' }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? 'Could not release this one.');
      setStage('pick');
      return;
    }
    setClaimed({
      meal: body.meal,
      live: body.settlement.live,
      explorer: body.settlement.explorer ?? undefined,
      note: body.settlement.note,
    });
    setStage('reveal');
    void load();
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '40rem', margin: '0 auto', minHeight: '70vh' }}>
      {stage === 'pick' && (
        <div>
          <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
            Claim a meal
          </p>
          <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', margin: '0.5rem 0 1rem' }}>
            Where are you?
          </h1>
          <p className="muted" style={{ marginBottom: '2rem', lineHeight: 1.6 }}>
            Nothing is released until a Blackbird check-in says you are in the building. That is the
            only key.
          </p>
          <label className="field">
            <span>Restaurant</span>
            <select value={locationId} onChange={e => setLocationId(e.target.value)}>
              {venues.map(v => {
                const n = meals.filter(m => m.locationId === v.locationId && m.status === 'waiting').length;
                return (
                  <option key={v.locationId} value={v.locationId}>
                    {v.name} — {v.neighborhood}
                    {n > 0 ? ` (${n} waiting)` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ekow" />
          </label>
          {error && <p style={{ color: '#ff8a6b', fontSize: '0.9rem' }}>{error}</p>}
          <button className="btn" onClick={arrive} disabled={!locationId}>
            I am here
          </button>
        </div>
      )}

      {(stage === 'arriving' || stage === 'searching' || stage === 'releasing') && (
        <div key={stage} className="reveal" style={{ paddingTop: '4rem' }} data-testid="stage" data-stage={stage}>
          <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
            {stage === 'arriving' ? 'Checking you in' : stage === 'searching' ? 'Checking the ledger' : 'Check-in verified'}
          </p>
          <h1 className="display" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.6rem)', margin: '0.75rem 0' }}>
            {stage === 'arriving'
              ? `${venue?.name ?? 'This restaurant'}, ${venue?.neighborhood ?? ''}.`
              : stage === 'searching'
                ? `Is there anything here for ${name || 'you'}?`
                : 'Releasing the escrow.'}
          </h1>
          {stage === 'releasing' && (
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              The escrow wallet is paying out to {name || 'you'}. Nobody approved this — the check-in did.
            </p>
          )}
        </div>
      )}

      {stage === 'empty' && (
        <div className="reveal" style={{ paddingTop: '3rem' }}>
          <h1 className="display" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.6rem)' }}>
            Nothing here yet.
          </h1>
          <p className="muted" style={{ lineHeight: 1.6, marginBottom: '2rem' }}>
            No one has left a meal at {venue?.name} — but you could be the first.
          </p>
          <Link className="btn" href="/leave">
            Leave one instead
          </Link>
        </div>
      )}

      {stage === 'reveal' && claimed && (
        <div className="stagger" style={{ paddingTop: '2rem' }}>
          <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem', margin: 0 }}>
            {claimed.meal.fromName} left this for you
          </p>
          <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 7vw, 4rem)', margin: '0.75rem 0 1.5rem', lineHeight: 1.05 }}>
            Dinner is covered.
          </h1>
          {claimed.meal.note && (
            <p className="note" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', lineHeight: 1.5 }}>
              {claimed.meal.note}
            </p>
          )}
          <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p className="muted" style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Released
                </p>
                <p className="display" style={{ margin: '0.25rem 0 0', fontSize: '1.9rem' }}>
                  ${(claimed.meal.amountCents / 100).toFixed(2)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="muted" style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  At
                </p>
                <p style={{ margin: '0.25rem 0 0' }}>{claimed.meal.venueName}</p>
              </div>
            </div>
            <hr className="rule" style={{ margin: '1.25rem 0' }} />
            <TxBadge live={claimed.live} />
            <p className="mono" style={{ marginTop: '0.75rem' }}>{claimed.meal.releaseTx}</p>
            {claimed.explorer && (
              <a href={claimed.explorer} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>
                View on BaseScan ↗
              </a>
            )}
            {claimed.live && claimed.note && (
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>{claimed.note}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link className="btn" href="/leave">
              Pass it on
            </Link>
            <Link className="btn ghost" href="/wall">
              See the wall
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
