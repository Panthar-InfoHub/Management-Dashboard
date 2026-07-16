// ── Leave Policy Configuration ──
// Single place to define leave types, allocations, and fiscal year logic.
// Fiscal year: April 1 – March 31 (Indian standard).

import type { LeaveType } from "@prisma/client";

// ── Leave Allocations per Fiscal Year ──

export const LEAVE_ALLOCATIONS: Record<LeaveType, number> = {
  CASUAL: 12,
  SICK: 12,
};

// ── Fiscal Year Helpers ──

/**
 * Get the fiscal year for a given date.
 * Fiscal year runs Apr 1 – Mar 31.
 * e.g. March 2027 → FY 2026, April 2027 → FY 2027
 */
export function getFiscalYear(date: Date = new Date()): number {
  const month = date.getMonth(); // 0-indexed: 0=Jan, 3=Apr
  const year = date.getFullYear();
  return month >= 3 ? year : year - 1; // Apr (3) onwards = current year
}

/**
 * Get the start and end dates of a fiscal year.
 */
export function getFiscalYearRange(fy: number): { start: Date; end: Date } {
  return {
    start: new Date(fy, 3, 1),       // April 1
    end: new Date(fy + 1, 2, 31),    // March 31 next year
  };
}

/**
 * Initialize leave balances for a new employee for the current fiscal year.
 * Called when a new employee is synced via webhook.
 */
export function getDefaultLeaveBalances(fiscalYear?: number) {
  const fy = fiscalYear ?? getFiscalYear();
  return Object.entries(LEAVE_ALLOCATIONS).map(([type, total]) => ({
    leaveType: type as LeaveType,
    fiscalYear: fy,
    total,
    used: 0,
    remaining: total,
  }));
}
