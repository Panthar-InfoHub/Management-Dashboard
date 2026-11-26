// Leave tracking policy.
//
// Each leave year (January–December) starts fresh: unused days never carry over.
// 2026 is the setup year: everyone gets the full 2026 allowance (no proration,
// past usage isn't tracked).

/** Balances are prorated only from this date (or a later join date). */
export const LEAVE_TRACKING_START = "2026-01-01";

/** Leave year = calendar year (January–December). */
export function leaveYearOf(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}
