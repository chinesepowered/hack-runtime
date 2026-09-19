import { readMeals } from '@/lib/store';
import { chainLabel } from '@/lib/escrow';

export const dynamic = 'force-dynamic';

const ago = (iso: string) => {
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default async function WallPage() {
  const meals = await readMeals();
  const claimed = meals.filter(m => m.status === 'claimed');
  const waiting = meals.filter(m => m.status === 'waiting');

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '76rem', margin: '0 auto' }}>
      <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
        The wall
      </p>
      <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0.5rem 0 0.75rem' }}>
        Every meal, and what was said with it.
      </h1>
      <p className="muted" style={{ marginBottom: '3rem', maxWidth: '38rem', lineHeight: 1.65 }}>
        {claimed.length} claimed, {waiting.length} still waiting. Escrow settles in USDC on {chainLabel()};
        each release is keyed to a Blackbird check-in at the restaurant named on the note.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))' }}>
        {[...waiting, ...claimed].map(meal => (
          <article key={meal.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
              <span className="display" style={{ fontSize: '1.4rem', color: 'var(--gold)' }}>
                ${(meal.amountCents / 100).toFixed(0)}
              </span>
              <span className="badge">{meal.status === 'waiting' ? 'Waiting' : `Claimed · ${ago(meal.claimedAt ?? meal.createdAt)}`}</span>
            </div>
            {meal.note ? (
              <p className="note" style={{ margin: 0, flex: 1 }}>{meal.note}</p>
            ) : (
              <p className="muted" style={{ margin: 0, flex: 1, fontStyle: 'italic' }}>No note.</p>
            )}
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {meal.venueName} <span className="muted">· {meal.neighborhood}</span>
              </p>
              <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                {meal.fromName}
                {meal.claimedBy ? ` → ${meal.claimedBy}` : meal.toName ? ` → held for ${meal.toName}` : ' → anyone'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
