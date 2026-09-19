/**
 * Says out loud whether what you are looking at came from live credentials or
 * from the seeded set. Every sponsor guide asks for mocked steps to be marked,
 * so this badge is rendered anywhere data or a transaction is shown.
 */
export function SourceBadge({ source }: { source: 'live' | 'seeded' }) {
  const live = source === 'live';
  return (
    <span className="badge" data-live={live} title={live ? 'Live Flynet staging data' : 'Seeded fixture data'}>
      <span className="dot" />
      {live ? 'Live Flynet' : 'Seeded'}
    </span>
  );
}

export function TxBadge({ live }: { live: boolean }) {
  return (
    <span className="badge" data-live={live}>
      <span className="dot" />
      {live ? 'On-chain' : 'Simulated settlement'}
    </span>
  );
}
