'use client';

import { useState } from 'react';
import type { Meal, Venue } from '@/lib/types';

/**
 * A stylized map, not a geographic one.
 *
 * Flynet returns real addresses, and plotting them on a tile map would put real
 * restaurant locations behind fictional demo data. The landmasses here are drawn
 * shapes and the coordinates are illustrative, which keeps the visual honest
 * while still reading instantly as New York.
 */
const MANHATTAN =
  'M 500 60 C 516 76, 514 104, 504 132 C 488 180, 464 230, 440 278 ' +
  'C 418 322, 396 362, 376 402 C 360 434, 348 462, 340 490 ' +
  'L 310 484 C 316 456, 328 426, 342 394 C 362 346, 386 294, 410 242 ' +
  'C 432 194, 458 138, 476 94 C 484 74, 490 60, 500 60 Z';

const BROOKLYN =
  'M 548 198 C 610 196, 668 210, 722 240 C 770 266, 812 300, 842 344 ' +
  'C 874 392, 890 448, 878 500 C 866 556, 828 604, 772 638 ' +
  'C 716 672, 640 690, 566 686 C 512 682, 466 668, 442 644 ' +
  'C 418 620, 416 590, 434 564 C 452 538, 482 520, 508 496 ' +
  'C 534 472, 550 442, 548 408 C 546 372, 530 340, 526 306 ' +
  'C 522 262, 522 218, 548 198 Z';

/** Roosevelt Island, for a bit of coastline character. */
const ROOSEVELT = 'M 520 236 C 528 248, 518 276, 506 296 C 500 286, 506 254, 514 238 Z';

export function MapNYC({
  venues,
  meals,
  onPick,
}: {
  venues: Venue[];
  meals: Meal[];
  onPick?: (venue: Venue) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const waitingAt = (locationId: string) =>
    meals.filter(m => m.locationId === locationId && m.status === 'waiting');

  return (
    <svg
      viewBox="0 0 1000 700"
      role="img"
      aria-label="Suspended meals across New York"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', maxHeight: '62vh', display: 'block' }}
    >
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#ffd9a0" stopOpacity="1" />
          <stop offset="45%" stopColor="#ff8a3d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff6a2b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="land" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#3d2a1d" />
          <stop offset="100%" stopColor="#2a1c13" />
        </linearGradient>
      </defs>

      {/* Water: a few slow strokes so the negative space is not dead. */}
      {[120, 200, 280, 360, 440, 520, 600].map(y => (
        <path
          key={y}
          d={`M -20 ${y} C 240 ${y - 18}, 520 ${y + 20}, 1020 ${y - 10}`}
          stroke="#140d08"
          strokeWidth="2"
          fill="none"
        />
      ))}

      <g stroke="rgba(255,200,130,0.28)" strokeWidth="1.25">
        <path d={MANHATTAN} fill="url(#land)" />
        <path d={BROOKLYN} fill="url(#land)" />
        <path d={ROOSEVELT} fill="url(#land)" opacity={0.85} />
      </g>

      {venues.map(venue => {
        const count = waitingAt(venue.locationId).length;
        const claimed = count === 0;
        const showLabel = hover === venue.locationId || count > 0;
        return (
          <g
            key={venue.locationId}
            className="pin"
            data-claimed={claimed}
            data-venue={venue.name}
            onMouseEnter={() => setHover(venue.locationId)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.(venue)}
          >
            {!claimed && (
              <>
                <circle cx={venue.x} cy={venue.y} r={46} fill="url(#glow)" opacity={0.3} />
                <circle className="halo" cx={venue.x} cy={venue.y} r={22} fill="url(#glow)" />
              </>
            )}
            <circle
              cx={venue.x}
              cy={venue.y}
              r={claimed ? 4 : 8}
              fill={claimed ? '#6b5240' : '#ffe0ae'}
            />
            {showLabel && (
              <text className="pin-label" x={venue.x + 17} y={venue.y + 5}>
                {venue.name}
                {count > 1 ? ` · ${count}` : ''}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
