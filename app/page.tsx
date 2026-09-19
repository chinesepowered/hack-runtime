import Link from 'next/link';
import { SourceBadge } from '@/components/Badge';
import { MapNYC } from '@/components/MapNYC';
import { listVenues } from '@/lib/flynet';
import { readMeals } from '@/lib/store';
import { chainLabel } from '@/lib/escrow';

export const dynamic = 'force-dynamic';

const money = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default async function HomePage() {
  const [{ source, data: venues }, meals] = await Promise.all([listVenues(), readMeals()]);
  const waiting = meals.filter(m => m.status === 'waiting');
  const waitingCents = waiting.reduce((sum, m) => sum + m.amountCents, 0);
  const neighborhoods = new Set(waiting.map(m => m.neighborhood)).size;
  const recent = meals.filter(m => m.status === 'claimed').slice(0, 3);

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '1400px', margin: '0 auto' }}>
      <section style={{ display: 'grid', gap: '3rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="stagger" style={{ maxWidth: '46rem' }}>
          <p className="muted" style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.72rem', margin: 0 }}>
            Suspended meals · New York
          </p>
          <h1 className="display big" style={{ margin: '0.75rem 0 1.25rem' }}>
            Leave dinner for someone
            <br />
            you will never meet.
          </h1>
          <p className="muted" style={{ fontSize: '1.08rem', lineHeight: 1.65, maxWidth: '34rem', margin: 0 }}>
            Pay for a meal at a restaurant you love and leave it there. The next person who walks in
            and needs it eats. No account, no means test, no thanks owed — the money is held in
            escrow and only moves when a Blackbird check-in proves someone is actually at the table.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link className="btn" href="/leave">
              Leave a meal
            </Link>
            <Link className="btn ghost" href="/wall">
              Read the wall
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'clamp(1.5rem, 4vw, 3.5rem)', flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div className="display counter">{waiting.length}</div>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>meals waiting right now</p>
          </div>
          <div>
            <div className="display counter">{money(waitingCents)}</div>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>held in escrow on {chainLabel()}</p>
          </div>
          <div>
            <div className="display counter">{neighborhoods}</div>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>neighbourhoods covered</p>
          </div>
        </div>

        <div id="map" className="card" style={{ padding: 0, position: 'relative', scrollMarginTop: '1.5rem', background: '#0a0705', overflow: 'hidden', borderRadius: '1rem' }}>
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 2 }}>
            <SourceBadge source={source} />
          </div>
          <MapNYC venues={venues} meals={meals} />
        </div>

        {recent.length > 0 && (
          <div>
            <h2 className="display" style={{ fontSize: '1.5rem', margin: '0 0 1.25rem' }}>
              Lately
            </h2>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))' }}>
              {recent.map(meal => (
                <article key={meal.id} className="card">
                  <p className="note" style={{ margin: '0 0 1rem' }}>{meal.note}</p>
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {meal.fromName} → {meal.claimedBy} · {meal.venueName}, {meal.neighborhood}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
