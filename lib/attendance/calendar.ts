// Pure date rules. No database, no "now": callers pass everything in, so these
// are easy to test and identical on server and client.

export type DayKindValue = "OFFICE" | "WFH" | "OFF" | "HOLIDAY";
export type WeekPattern = DayKindValue[]; // 7 values, Sunday first

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const DAY_KIND_LABELS: Record<DayKindValue, string> = {
  OFFICE: "Office day",
  WFH: "Work from home",
  OFF: "Off",
  HOLIDAY: "Holiday",
};

/** "YYYY-MM-DD" for a Date that holds a calendar day (stored as UTC midnight). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Calendar day "YYYY-MM-DD" → Date at UTC midnight, the form `@db.Date` columns use. */
export function fromDateKey(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date: ${key}`);
  const date = new Date(`${key}T00:00:00.000Z`);
  if (isNaN(date.getTime()) || toDateKey(date) !== key) throw new Error(`Invalid date: ${key}`);
  return date;
}

/** Today's calendar day in a timezone, e.g. "Asia/Kolkata" (servers run in UTC). */
export function todayKey(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Minutes since midnight in a timezone, for comparing against "HH:mm" cut-offs. */
export function minutesOfDay(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return hour * 60 + minute;
}

export function parseHHmm(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`Invalid time "${value}". Use HH:mm, e.g. 11:00.`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * What a day is for an office: a dated override (holiday, special office day)
 * wins over the weekly pattern.
 */
export function dayKindFor(dateKey: string, weekPattern: WeekPattern, overrides: ReadonlyMap<string, DayKindValue>): DayKindValue {
  const override = overrides.get(dateKey);
  if (override) return override;
  const weekday = fromDateKey(dateKey).getUTCDay();
  return weekPattern[weekday] ?? "OFFICE";
}

/** Days from start to end inclusive, as keys. */
export function eachDateKey(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const end = fromDateKey(endKey).getTime();
  for (let t = fromDateKey(startKey).getTime(); t <= end; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
