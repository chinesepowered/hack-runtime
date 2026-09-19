'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SourceBadge } from '@/components/Badge';
import type { Meal, MealKind, Venue } from '@/lib/types';

const PRESETS = [1500, 2500, 4000];
const KINDS: { id: MealKind; label: string; blurb: string }[] = [
  { id: 'open', label: 'For anyone', blurb: 'The next person who walks in and needs it.' },
  { id: 'named', label: 'For someone', blurb: 'Held for one person by name.' },
  { id: 'locked', label: 'For a date', blurb: 'Sealed until the day you choose.' },
];

export default function LeavePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [source, setSource] = useState<'live' | 'seeded'>('seeded');
  const [kind, setKind] = useState<MealKind>('open');
  const [locationId, setLocationId] = useState('');
  const [amountCents, setAmountCents] = useState(1500);
  const [note, setNote] = useState('');
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [unlocksAt, setUnlocksAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ meal: Meal; escrow: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/meals')
      .then(r => r.json())
      .then((d: { venues: Venue[]; source: 'live' | 'seeded' }) => {
        setVenues(d.venues);
        setSource(d.source);
        setLocationId(d.venues[0]?.locationId ?? '');
      })
      .catch(() => setError('Could not load restaurants.'));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locationId, amountCents, note, fromName, kind, toName, unlocksAt }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error ?? 'Something went wrong.');
    setDone({ meal: body.meal, escrow: body.escrowAddress ?? null });
  }

  if (done) {
    const venue = venues.find(v => v.locationId === done.meal.locationId);
    return (
      <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '38rem', margin: '0 auto' }} className="reveal">
        <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
          It is waiting
        </p>
        <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0.5rem 0 1.5rem' }}>
          ${(done.meal.amountCents / 100).toFixed(0)} at {venue?.name ?? done.meal.venueName}.
        </h1>
        {done.meal.note && <p className="note" style={{ fontSize: '1.2rem' }}>{done.meal.note}</p>}
        <hr className="rule" style={{ margin: '2rem 0' }} />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span className="badge">
            <span className="dot" />
            Pledged to escrow
          </span>
        </div>
        <p className="mono">
          {done.escrow ? `escrow wallet ${done.escrow}` : 'escrow wallet not configured — release will be simulated'}
        </p>
        <p className="muted" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
          Nobody can move this but the person who sits down at {venue?.name ?? done.meal.venueName} and
          checks in. Not you, not us, not the restaurant.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link className="btn" href="/">
            Back to the map
          </Link>
          <button className="btn ghost" onClick={() => setDone(null)}>
            Leave another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '38rem', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem', margin: 0 }}>
          Leave a meal
        </p>
        <SourceBadge source={source} />
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', margin: '0.5rem 0 2rem' }}>
        Who is it for?
      </h1>

      <div className="tabs">
        {KINDS.map(k => (
          <button key={k.id} type="button" className="tab" data-on={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: '-0.75rem', marginBottom: '2rem', fontSize: '0.92rem' }}>
        {KINDS.find(k => k.id === kind)?.blurb}
      </p>

      <form onSubmit={submit}>
        <label className="field">
          <span>Restaurant</span>
          <select value={locationId} onChange={e => setLocationId(e.target.value)}>
            {venues.map(v => (
              <option key={v.locationId} value={v.locationId}>
                {v.name} — {v.neighborhood}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Amount</span>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {PRESETS.map(cents => (
              <button key={cents} type="button" className="tab" data-on={amountCents === cents} onClick={() => setAmountCents(cents)}>
                ${cents / 100}
              </button>
            ))}
          </div>
        </div>

        {kind === 'named' && (
          <label className="field">
            <span>Their name</span>
            <input value={toName} onChange={e => setToName(e.target.value)} placeholder="Ekow" />
          </label>
        )}

        {kind === 'locked' && (
          <label className="field">
            <span>Opens on</span>
            <input type="date" value={unlocksAt} onChange={e => setUnlocksAt(e.target.value)} />
          </label>
        )}

        <label className="field">
          <span>A note, if you want one</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={240}
            placeholder="For whoever is having the week I had."
          />
        </label>

        <label className="field">
          <span>Signed</span>
          <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Anonymous" />
        </label>

        {error && <p style={{ color: '#ff8a6b', fontSize: '0.9rem' }}>{error}</p>}

        <button className="btn" type="submit" disabled={busy || !locationId}>
          {busy ? 'Funding escrow…' : 'Leave it there'}
        </button>
      </form>
    </div>
  );
}
