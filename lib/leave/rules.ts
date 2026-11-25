// Leave and request rules as pure functions (no database, no clock).
import type { DayKindValue } from "@/lib/attendance/calendar";

export type RequestKindValue = "LEAVE" | "WFH" | "ATTENDANCE_FIX";
export type RequestStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export const REQUEST_KIND_LABELS: Record<RequestKindValue, string> = {
  LEAVE: "Leave",
  WFH: "Work From Home",
  ATTENDANCE_FIX: "Attendance Fix",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Longest request range, in calendar days. */
export const MAX_REQUEST_SPAN_DAYS = 60;

/**
 * Days a request counts.
 * - Leave: working days (office or WFH) in the range; a half day is 0.5.
 * - WFH: office days in the range (WFH and off days are already not office).
 * - Attendance fix: 0.
 */
export function requestDays(kind: RequestKindValue, days: { dayKind: DayKindValue }[], halfDay: boolean): number {
  if (kind === "ATTENDANCE_FIX") return 0;
  if (kind === "WFH") return days.filter((d) => d.dayKind === "OFFICE").length;
  const working = days.filter((d) => d.dayKind === "OFFICE" || d.dayKind === "WFH").length;
  return halfDay ? Math.min(working, 1) * 0.5 : working;
}

/**
 * Yearly allowance for a person in a year, reduced for the months already gone
 * when they (or leave tracking) started that year. Rounded down to half days.
 * `startKey` is the later of their join date and the tracking start date.
 */
export function proratedAllowance(yearlyDays: number, year: number, startKey: string): number {
  const startYear = Number(startKey.slice(0, 4));
  if (startYear < year) return yearlyDays;
  if (startYear > year) return 0;
  const monthsLeft = 12 - (Number(startKey.slice(5, 7)) - 1);
  return Math.floor(((yearlyDays * monthsLeft) / 12) * 2) / 2;
}

/** Days still free: allowance + carried over + adjustments − used − pending. */
export function availableDays(b: { allowed: number; carriedOver: number; adjusted: number; used: number }, pending = 0): number {
  return b.allowed + b.carriedOver + b.adjusted - b.used - pending;
}

/** Unused days moved into the next year, capped by the leave type. */
export function carryOver(previous: { allowed: number; carriedOver: number; adjusted: number; used: number } | null, carryOverMax: number): number {
  if (!previous || carryOverMax <= 0) return 0;
  return Math.max(0, Math.min(carryOverMax, availableDays(previous)));
}
