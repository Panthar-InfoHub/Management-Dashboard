// Attendance rules as pure functions: no database, no clock. The actions pass
// in the office settings, the day and the time, and store what comes back.
import type { DayKindValue } from "@/lib/attendance/calendar";

export type AttendanceStatusValue =
  | "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "WFH" | "HOLIDAY" | "WEEKLY_OFF";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: "Present",
  LATE: "Late",
  HALF_DAY: "Half Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  WFH: "WFH",
  HOLIDAY: "Holiday",
  WEEKLY_OFF: "Weekly Off",
};

/** Browsers report accuracy in metres; beyond this a fix is too vague to trust. */
export const MAX_LOCATION_ACCURACY_M = 200;

export type GeoPoint = { lat: number; lng: number; accuracy?: number | null };

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export type GeofenceResult =
  | { ok: true; distanceMeters: number }
  | { ok: false; reason: "missing" | "imprecise" | "outside"; distanceMeters?: number };

/** Office days need a location inside the radius; the server always recomputes the distance. */
export function checkGeofence(point: GeoPoint | null, office: { latitude: number; longitude: number; radiusMeters: number }): GeofenceResult {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return { ok: false, reason: "missing" };
  if (point.accuracy != null && point.accuracy > MAX_LOCATION_ACCURACY_M) return { ok: false, reason: "imprecise" };
  const d = distanceMeters(point, { lat: office.latitude, lng: office.longitude });
  return d <= office.radiusMeters ? { ok: true, distanceMeters: d } : { ok: false, reason: "outside", distanceMeters: d };
}

/**
 * Status for a clock-in.
 * - Office day: on time → Present; after the cut-off → Half Day (pending
 *   review) or Late, as the office is set up.
 * - WFH day: WFH, flagged late after the cut-off but never cut to a half day.
 * - Off day or holiday: Present (working on a day off is recorded as such).
 */
export function statusForCheckIn(input: {
  dayKind: DayKindValue;
  minutesNow: number;
  lateAfterMinutes: number;
  lateOutcome: "HALF_DAY" | "LATE";
}): { status: AttendanceStatusValue; isLate: boolean; needsReview: boolean } {
  const late = input.minutesNow > input.lateAfterMinutes;
  if (input.dayKind === "WFH") return { status: "WFH", isLate: late, needsReview: false };
  if (input.dayKind !== "OFFICE") return { status: "PRESENT", isLate: false, needsReview: false };
  if (!late) return { status: "PRESENT", isLate: false, needsReview: false };
  return input.lateOutcome === "HALF_DAY"
    ? { status: "HALF_DAY", isLate: true, needsReview: true }
    : { status: "LATE", isLate: true, needsReview: false };
}

/**
 * A day ends at midnight (office time). A clock-in from an earlier day with no
 * clock-out can't be closed any more: it is a missed checkout.
 */
export function isSessionExpired(sessionDateKey: string, todayDateKey: string): boolean {
  return sessionDateKey < todayDateKey;
}

/**
 * Left-early and overtime at clock-out, from office hours (minutes since midnight).
 * - Office or WFH day: overtime = time before office start + time after office
 *   end; clocking out before office end = left early.
 * - Off day or holiday: every worked minute is overtime, never "left early".
 */
export function checkoutFlags(input: {
  dayKind: DayKindValue;
  checkInMinutes: number;
  checkOutMinutes: number;
  workStartMinutes: number;
  workEndMinutes: number;
  workMinutes: number;
}): { leftEarly: boolean; earlyMinutes: number | null; overtimeMinutes: number | null } {
  if (input.dayKind === "OFF" || input.dayKind === "HOLIDAY") {
    return { leftEarly: false, earlyMinutes: null, overtimeMinutes: input.workMinutes > 0 ? input.workMinutes : null };
  }
  const before = Math.max(0, Math.min(input.workStartMinutes, input.checkOutMinutes) - input.checkInMinutes);
  const after = Math.max(0, input.checkOutMinutes - Math.max(input.workEndMinutes, input.checkInMinutes));
  const overtime = before + after;
  const leftEarly = input.checkOutMinutes < input.workEndMinutes;
  return {
    leftEarly,
    earlyMinutes: leftEarly ? input.workEndMinutes - input.checkOutMinutes : null,
    overtimeMinutes: overtime > 0 ? overtime : null,
  };
}

/**
 * Status once the day's hours are known (at clock-out). Starts from the
 * clock-in rule, then the optional short-day rule: on an office day, fewer
 * worked minutes than `minFullDayMinutes` makes it a Half Day (pending review).
 */
export function statusForDay(input: {
  dayKind: DayKindValue;
  checkInMinutes: number;
  workMinutes: number | null;
  lateAfterMinutes: number;
  lateOutcome: "HALF_DAY" | "LATE";
  minFullDayMinutes: number | null;
}): { status: AttendanceStatusValue; isLate: boolean; needsReview: boolean } {
  const base = statusForCheckIn({ dayKind: input.dayKind, minutesNow: input.checkInMinutes, lateAfterMinutes: input.lateAfterMinutes, lateOutcome: input.lateOutcome });
  const short =
    input.dayKind === "OFFICE" &&
    input.minFullDayMinutes != null &&
    input.workMinutes != null &&
    input.workMinutes < input.minFullDayMinutes;
  if (short && base.status !== "HALF_DAY") return { status: "HALF_DAY", isLate: base.isLate, needsReview: true };
  return base;
}

/** Whole minutes between clock-in and clock-out. */
export function workedMinutes(checkInAt: Date, checkOutAt: Date): number {
  return Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60_000));
}

/** What a day with no attendance row shows as. */
export function statusForEmptyDay(dayKind: DayKindValue, isPast: boolean): AttendanceStatusValue | null {
  if (dayKind === "HOLIDAY") return "HOLIDAY";
  if (dayKind === "OFF") return "WEEKLY_OFF";
  return isPast ? "ABSENT" : null; // today or future: not decided yet
}

/** "09:42" in the office timezone. */
export function formatTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
