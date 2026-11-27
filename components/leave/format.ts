import { to12h } from "@/lib/attendance/rules";
import { fromDateKey } from "@/lib/attendance/calendar";
import { REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";

export function formatDay(key: string) {
  return fromDateKey(key).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatRange(start: string, end: string) {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

/** "Casual Leave · 2 days", "WFH · 1 day", "Attendance Fix · 09:30–18:45". */
/** "10:52 AM–7:00 PM", or "from 10:52 AM, still working" for a fix with no clock-out. */
export function fixTimes(checkIn: string | null, checkOut: string | null) {
  return checkOut ? `${to12h(checkIn)}–${to12h(checkOut)}` : `from ${to12h(checkIn)}, still working`;
}

export function requestSummary(r: { kind: RequestKindValue; leaveType: string | null; days: number; halfDay: string | null; fixCheckIn: string | null; fixCheckOut: string | null; workMode?: string | null; status?: string; excuseLate?: boolean; arriveBy?: string | null }) {
  if (r.kind === "LATE_ARRIVAL") {
    const by = r.arriveBy ? ` · arriving by ${to12h(r.arriveBy)}` : "";
    return r.status === "APPROVED" ? `${REQUEST_KIND_LABELS.LATE_ARRIVAL}${by} · counts as ${r.excuseLate ? "Present" : "Late"}` : `${REQUEST_KIND_LABELS.LATE_ARRIVAL}${by}`;
  }
  if (r.kind === "ATTENDANCE_FIX") return `${REQUEST_KIND_LABELS.ATTENDANCE_FIX} · ${fixTimes(r.fixCheckIn, r.fixCheckOut)} · ${r.workMode === "WFH" ? "from home" : "at the office"}`;
  const what = r.kind === "LEAVE" ? r.leaveType ?? "Leave" : "WFH";
  const half = r.halfDay ? ` (${r.halfDay === "FIRST_HALF" ? "first half" : "second half"})` : "";
  return `${what}${half} · ${r.days} day${r.days === 1 ? "" : "s"}`;
}
