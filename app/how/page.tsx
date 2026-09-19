import { hasDiscoveryCreds } from '@/lib/flynet';
import { chainLabel, hasWalletCreds } from '@/lib/escrow';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    n: '1',
    title: 'Leave',
    body: 'A giver picks a Blackbird venue, an amount and who it is for. The meal is committed to escrow.',
    tech: 'Flynet · GET /locations',
  },
  {
    n: '2',
    title: 'Hold',
    body: 'Funds sit in a Dynamic server wallet owned by the app — not the giver, not the restaurant.',
    tech: 'Dynamic · server wallet, API-token auth',
  },
  {
    n: '3',
    title: 'Arrive',
    body: 'The claimer checks in at that venue. A check-in there in the last four hours is the only key.',
    tech: 'Flynet · GET /users/me/check_ins',
  },
  {
    n: '4',
    title: 'Release',
    body: 'The server wallet signs a USDC transfer to the wallet the member already holds in Blackbird.',
    tech: 'Flynet · GET /users/me/wallets → Dynamic · signTransaction',
  },
];

/**
 * The judge-facing explanation. Status rows are computed from the running
 * configuration rather than written by hand, so this page cannot claim a live
 * integration that the server does not actually have.
 */
export default function HowPage() {
  const flynetLive = hasDiscoveryCreds();
  const walletLive = hasWalletCreds();

  const status = [
    { what: 'Venues', live: flynetLive, liveText: 'Live Flynet staging', offText: 'Seeded, shaped like Flynet staging' },
    { what: 'Check-ins', live: false, liveText: 'Live, via member OAuth', offText: 'Recorded locally for the demo' },
    { what: 'Settlement', live: walletLive, liveText: `On-chain USDC, ${chainLabel()}`, offText: 'Simulated, badged on every receipt' },
  ];

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', maxWidth: '72rem', margin: '0 auto' }}>
      <p className="muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
        How it works
      </p>
      <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 3.1rem)', margin: '0.5rem 0 0.75rem' }}>
        Presence is the key.
      </h1>
      <p className="muted" style={{ maxWidth: '40rem', lineHeight: 1.65, marginBottom: '2.75rem' }}>
        An escrowed meal that only a check-in can open. Nobody decides who deserves it — the only question
        the system asks is whether you are actually at the table.
      </p>

      <ol
        className="stagger"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 3rem',
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
        }}
      >
        {STEPS.map(step => (
          <li key={step.n} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span className="display" style={{ fontSize: '2.2rem', color: 'var(--gold)', lineHeight: 1 }}>
              {step.n}
            </span>
            <h2 className="display" style={{ fontSize: '1.45rem', margin: 0 }}>
              {step.title}
            </h2>
            <p style={{ margin: 0, lineHeight: 1.55, flex: 1 }}>{step.body}</p>
            <p className="mono" style={{ margin: 0, color: 'var(--gold)' }}>
              {step.tech}
            </p>
          </li>
        ))}
      </ol>

      <h2 className="display" style={{ fontSize: '1.5rem', margin: '0 0 1rem' }}>
        What is live in this build
      </h2>
      <div className="card" style={{ padding: 0 }}>
        {status.map((row, i) => (
          <div
            key={row.what}
            data-testid="status-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderTop: i === 0 ? 'none' : '1px solid rgba(247, 237, 225, 0.08)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 500 }}>{row.what}</span>
            <span className="badge" data-live={row.live}>
              <span className="dot" />
              {row.live ? row.liveText : row.offText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
