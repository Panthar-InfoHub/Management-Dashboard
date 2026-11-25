// Leave tracking policy.
//
// 2026 is the setup year: everyone gets the full 2026 allowance (no proration,
// past usage isn't tracked) and nothing carries into 2027, so 2027 starts
// clean on 1 January. Normal carry-over begins with 2027 → 2028.

/** Balances are prorated only from this date (or a later join date). */
export const LEAVE_TRACKING_START = "2026-01-01";

/** Unused days carry over only from this year onwards (2027 → 2028 is the first). */
export const FIRST_CARRY_OVER_FROM_YEAR = 2027;

/** Leave year = calendar year (January–December). */
export function leaveYearOf(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}
