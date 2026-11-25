// When attendance tracking began. Days before this (or before someone's join
// date) are blank, never "Absent". Set ATTENDANCE_START_DATE per environment
// (YYYY-MM-DD); production should use the real launch date.
const FALLBACK_START = "2026-12-01";

export const ATTENDANCE_START_DATE = /^\d{4}-\d{2}-\d{2}$/.test(process.env.ATTENDANCE_START_DATE ?? "")
  ? (process.env.ATTENDANCE_START_DATE as string)
  : FALLBACK_START;

/** First tracked day for a person: the later of the start date and their join date. */
export function trackedFrom(joinDateKey: string | null | undefined): string {
  return joinDateKey && joinDateKey > ATTENDANCE_START_DATE ? joinDateKey : ATTENDANCE_START_DATE;
}
