export type MealKind = 'open' | 'named' | 'locked';
export type MealStatus = 'waiting' | 'claimed';

/** A Flynet location, narrowed to the fields this product needs. */
export type Venue = {
  /** Flynet location id — the escrow's venue key. */
  locationId: string;
  /** Flynet restaurant (brand) id. */
  restaurantId: string;
  name: string;
  neighborhood: string;
  /** Stylized map coordinates, viewBox 1000x700. Not real geography. */
  x: number;
  y: number;
  /** Open-hours summary, from Flynet location open hours. */
  hours: string;
};

/**
 * An escrowed meal. Funded up front, released only when the claimer's
 * presence at `locationId` is proven by a Flynet check-in.
 */
export type Meal = {
  id: string;
  kind: MealKind;
  locationId: string;
  venueName: string;
  neighborhood: string;
  amountCents: number;
  note: string;
  fromName: string;
  /** `named` only: the one member who may claim. */
  toName?: string;
  /** `locked` only: not claimable before this instant. */
  unlocksAt?: string;
  createdAt: string;
  status: MealStatus;
  claimedAt?: string;
  claimedBy?: string;
  /** Funding transaction for the escrow (Dynamic server wallet). */
  fundingTx: string;
  /** Release transaction, once a check-in unlocked it. */
  releaseTx?: string;
  /** Set when this meal was left by someone who had just claimed one. */
  parentId?: string;
  /** True when real credentials backed this record. */
  live: boolean;
};

export type CheckIn = {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  at: string;
};

export type DataSource = 'live' | 'seeded';
