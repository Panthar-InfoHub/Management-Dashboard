// What an attendance fix would record for its day: the day kind, times, hours,
// flags and what the office rules suggest. Shared by the approval itself and
// the Approvals inbox, so the approver sees exactly what will be saved.
//
// The rules of an attendance fix (see docs/attendance-rules.md):
// - The clock-in is always given. The clock-out is required for a past day and
//   optional for today ("still working"): the day stays open and they clock
//   out as usual.
// - With no clock-out in the fix, a real clock-out already recorded after the
//   fixed clock-in is kept.
// - The approver picks the status; the rules only suggest one. The day then
//   counts as decided, so a later clock-out adds hours but never changes it.
import { db } from "@/lib/db";
import { getOfficeFor, dayKindsBetween } from "@/lib/attendance/queries";
import { minutesOfDay, parseHHmm, todayKey } from "@/lib/attendance/calendar";
import {
  checkoutFlags, fixOutcomeChoices, lateCutoffMinutes, statusForDay, suggestedFixOutcome, workedMinutes,
  type FixOutcome,
} from "@/lib/attendance/rules";

export type FixRequest = { employeeId: string; startDate: Date; fixCheckIn: Date; fixCheckOut: Date | null; workMode: string | null };

const NO_FLAGS = { leftEarly: false, earlyMinutes: null, overtimeMinutes: null };

export async function planAttendanceFix(request: FixRequest) {
  const office = await getOfficeFor(request.employeeId);
  const dateKey = request.startDate.toISOString().slice(0, 10);
  const [days, approvedWfh, recorded] = await Promise.all([
    dayKindsBetween(office, dateKey, dateKey),
    db.request.count({
      where: { employeeId: request.employeeId, kind: "WFH", status: "APPROVED", startDate: { lte: request.startDate }, endDate: { gte: request.startDate } },
    }),
    db.attendance.findUnique({
      where: { employeeId_date: { employeeId: request.employeeId, date: request.startDate } },
      select: { checkOutAt: true },
    }),
  ]);
  const baseKind = days[0].dayKind;
  // Worked from home on an office day (said in the fix, or an approved WFH) → a WFH day.
  const fromHome = request.workMode === "WFH" || approvedWfh > 0;
  const dayKind = fromHome && baseKind === "OFFICE" ? "WFH" : baseKind;

  const checkIn = request.fixCheckIn;
  const keptCheckOut = recorded?.checkOutAt && recorded.checkOutAt > checkIn ? recorded.checkOutAt : null;
  const checkOut = request.fixCheckOut ?? keptCheckOut;
  const minutes = checkOut ? workedMinutes(checkIn, checkOut) : null;

  const inMin = minutesOfDay(office.timezone, checkIn);
  const lateAfterMinutes = lateCutoffMinutes(office.lateAfter, office.graceMinutes);
  const rule = statusForDay({
    dayKind, checkInMinutes: inMin, workMinutes: minutes,
    lateAfterMinutes, lateOutcome: office.lateOutcome, minFullDayMinutes: office.minFullDayMinutes,
  });
  const flags = checkOut && minutes !== null
    ? checkoutFlags({
        dayKind, checkInMinutes: inMin, checkOutMinutes: minutesOfDay(office.timezone, checkOut),
        workStartMinutes: parseHHmm(office.workStart), workEndMinutes: parseHHmm(office.workEnd), workMinutes: minutes,
      })
    : NO_FLAGS;
  const arrivedLate = (dayKind === "OFFICE" || dayKind === "WFH") && inMin > lateAfterMinutes;
  const shortDay = dayKind === "OFFICE" && office.minFullDayMinutes != null && minutes !== null && minutes < office.minFullDayMinutes;

  return {
    office,
    dayKind,
    checkIn,
    checkOut,
    /** The clock-out came from the day's record, not the fix. */
    keptRecordedCheckOut: !request.fixCheckOut && !!keptCheckOut,
    /** No clock-out yet: the day stays open (today) or closes as a missed checkout (past day). */
    open: !checkOut,
    isPast: dateKey < todayKey(office.timezone),
    minutes,
    flags,
    arrivedLate,
    shortDay,
    lateAfter: office.lateAfter,
    choices: fixOutcomeChoices(dayKind),
    suggested: suggestedFixOutcome(dayKind, rule) as FixOutcome,
  };
}
