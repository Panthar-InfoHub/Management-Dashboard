import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";
import { fromDateKey, minutesOfDay, parseHHmm, todayKey, toDateKey } from "@/lib/attendance/calendar";
import {
  checkGeofence, checkoutFlags, clockInKind, excusedStatus, formatClock, isSessionExpired, lateArrivalCovers, lateCutoffMinutes, lateArrivalFields, to12h,
  statusForCheckIn, statusForDay, workedMinutes, MAX_LOCATION_ACCURACY_M, type GeoPoint,
} from "@/lib/attendance/rules";
import { dayKindOn, findOpenSession, getOfficeFor } from "@/lib/attendance/queries";
import { getCoverage } from "@/lib/leave/queries";

export function cleanPoint(point: GeoPoint | null | undefined, { ignoreAccuracy = false } = {}): GeoPoint | null {
  if (!point) return null;
  const lat = Number(point.lat), lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (ignoreAccuracy) return { lat, lng, accuracy: null };
  const accuracy = point.accuracy == null ? null : Number(point.accuracy);
  return { lat, lng, accuracy: Number.isFinite(accuracy) ? accuracy : null };
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const GEOFENCE_MESSAGES = {
  missing: "Location needed on office days. Allow location access and try again.",
  imprecise: `Your location is too vague (over ${MAX_LOCATION_ACCURACY_M} m). Turn on precise location or step near a window, then try again.`,
} as const;

/** Close an open session from an earlier day: missed checkout, no hours. */
async function markMissedCheckout(attendanceId: string) {
  await db.attendance.update({ where: { id: attendanceId }, data: { missedCheckout: true } });
}

/** Open session specifically for a given calendar date (`@db.Date`). */
export async function findOpenSessionOnDate(employeeId: string, dateKey: string) {
  return db.attendance.findFirst({
    where: {
      employeeId,
      date: fromDateKey(dateKey),
      checkInAt: { not: null },
      checkOutAt: null,
      missedCheckout: false,
    },
    select: { id: true, date: true, checkInAt: true, dayKind: true, reviewStatus: true },
  });
}

export async function recordClockIn(input: {
  employeeId: string;
  at?: Date;
  location?: GeoPoint | null;
  ignoreAccuracy?: boolean;
}) {
  const { employeeId, ignoreAccuracy = false } = input;
  const office = await getOfficeFor(employeeId);
  const now = input.at ?? new Date();
  const dateKey = todayKey(office.timezone, now);
  const date = fromDateKey(dateKey);

  // 1. Already in on this day? Blocked. Open from an earlier day? Close it as missed.
  let closedMissed: string | null = null;
  const open = await findOpenSession(employeeId);
  if (open?.checkInAt) {
    const openKey = toDateKey(open.date);
    if (openKey === dateKey) {
      throw new UserError(`You already clocked in today at ${formatClock(open.checkInAt, office.timezone)}.`);
    }
    if (isSessionExpired(openKey, dateKey)) {
      await markMissedCheckout(open.id);
      closedMissed = dayLabel(open.date);
    }
  }

  // What the day is for this person: office calendar, approved leave or WFH,
  // a WFH request still waiting, and whether they may work from home freely.
  const [baseKind, coverage, pending, person, excused, lateArrival] = await Promise.all([
    dayKindOn(office, dateKey),
    getCoverage([employeeId], dateKey, dateKey).then((m) => m.get(employeeId)?.get(dateKey) ?? null),
    db.request.findFirst({
      where: { employeeId, kind: "WFH", status: "PENDING", startDate: { lte: date }, endDate: { gte: date } },
      select: { id: true },
    }),
    db.employee.findUnique({ where: { id: employeeId }, select: { flexibleWfh: true } }),
    db.request.findFirst({
      where: { employeeId, status: "APPROVED", excuseLate: true, kind: { in: ["WFH", "ATTENDANCE_FIX"] }, startDate: { lte: date }, endDate: { gte: date } },
      select: { id: true },
    }),
    // A Late Arrival request approved in advance: a late clock-in isn't a half day.
    db.request.findFirst({
      where: { employeeId, status: "APPROVED", kind: "LATE_ARRIVAL", startDate: { lte: date }, endDate: { gte: date } },
      select: { excuseLate: true, arriveBy: true },
    }),
  ]);
  if (coverage?.kind === "LEAVE" && !coverage.halfDay) {
    throw new UserError(`You're on ${coverage.typeName ?? "leave"} today. Cancel the leave first if you're working.`);
  }
  const halfDayLeave = coverage?.kind === "LEAVE" && !!coverage.halfDay;
  const point = cleanPoint(input.location, { ignoreAccuracy });
  const fence = checkGeofence(point, office);
  const decided = clockInKind({
    baseKind,
    approvedWfh: coverage?.kind === "WFH",
    pendingWfh: !!pending,
    flexible: !!person?.flexibleWfh,
    fence,
  });
  if ("blocked" in decided) {
    const message = decided.blocked === "outside"
      ? `You're ${decided.distanceMeters} m from ${office.name}; clock-in works within ${office.radiusMeters} m. Working from home today? Request WFH, then clock in.`
      : GEOFENCE_MESSAGES[decided.blocked];
    return { success: false as const, blocked: decided.blocked, message, time: null };
  }
  const { kind: dayKind, awaitingWfh } = decided;
  const location = point
    ? { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? null, distanceMeters: fence.distanceMeters ?? null, inside: fence.ok }
    : null;

  // 2. One clock-in and one clock-out per day. Clocked out already: the day is
  //    done. (Clocking in again counted the break as work, so it's off for now;
  //    a wrong clock-out is fixed with Correct My Time.)
  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
    select: { id: true, checkInAt: true, checkOutAt: true },
  });
  if (existing?.checkInAt && !existing.checkOutAt) {
    throw new UserError(`You already clocked in today at ${formatClock(existing.checkInAt, office.timezone)}.`);
  }
  if (existing?.checkInAt && existing.checkOutAt) {
    throw new UserError(`You clocked out today at ${formatClock(existing.checkOutAt, office.timezone)}, so today is done. Clocked out by mistake? Send a Correct My Time request.`);
  }

  // 3. First clock-in of the day.
  const outcome = halfDayLeave
    ? { status: "HALF_DAY" as const, isLate: false }
    : statusForCheckIn({
        dayKind,
        minutesNow: minutesOfDay(office.timezone, now),
        lateAfterMinutes: lateCutoffMinutes(office.lateAfter, office.graceMinutes),
        lateOutcome: office.lateOutcome,
      });
  // Covered only up to "arrive by" + the office grace; later follows the normal rules.
  const minutesNow = minutesOfDay(office.timezone, now);
  const arriveByMin = lateArrival?.arriveBy ? minutesOfDay(office.timezone, lateArrival.arriveBy) : null;
  const covered = !!lateArrival && lateArrivalCovers(minutesNow, arriveByMin, office.graceMinutes);
  const late = covered && !halfDayLeave
    ? lateArrivalFields(dayKind, lateArrival!.excuseLate ? "PRESENT" : "LATE", outcome.isLate)
    : null;
  const missedArriveBy = !!lateArrival && !covered && outcome.isLate && !halfDayLeave;
  const excuseNow = !late && !!excused && outcome.isLate && !halfDayLeave;
  const data = {
    officeId: office.id,
    status: late?.status ?? (excuseNow ? excusedStatus(outcome.status) : outcome.status),
    dayKind,
    checkInAt: now,
    checkInLocation: location ?? undefined,
    isLate: late?.isLate ?? (excuseNow ? false : outcome.isLate),
    awaitingWfh,
    lateExcused: late?.lateExcused ?? excuseNow,
    // Settled by an approval: the clock-out adds hours but doesn't redo the status.
    reviewStatus: late || excuseNow ? ("APPROVED" as const) : null,
  };

  let recordId: string;
  try {
    const record = existing
      ? await db.attendance.update({ where: { id: existing.id }, data })
      : await db.attendance.create({ data: { ...data, employeeId, date } });
    recordId = record.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new UserError("You already clocked in today.");
    }
    throw err;
  }

  await db.attendanceEvent.create({
    data: { attendanceId: recordId, employeeId, type: "CHECK_IN", at: now, location: location ?? undefined },
  });

  const time = formatClock(now, office.timezone);
  const notes = [
    awaitingWfh && `Clocked in at ${time} as WFH. It's confirmed when your request is approved.`,
    !awaitingWfh && dayKind === "WFH" && person?.flexibleWfh && coverage?.kind !== "WFH" && `Clocked in at ${time} · working from home.`,
    closedMissed && `${closedMissed} had no clock-out, so it closed as a missed checkout. Send a time correction with your clock-out time.`,
    missedArriveBy && lateArrival?.arriveBy && `Your approved late arrival was until ${formatClock(lateArrival.arriveBy, office.timezone)} (plus ${office.graceMinutes} min), and you clocked in later, so the normal late rule applies today.`,
    !missedArriveBy && outcome.status === "HALF_DAY" && outcome.isLate && !late && !excuseNow && `Clocked in after ${to12h(office.lateAfter)}, so today is a half day. Late for a reason? Send a Late Arrival request.`,
    late && `Clocked in after ${to12h(office.lateAfter)}. Your approved late arrival counts today as ${late.status === "LATE" ? "Late" : late.status === "WFH" ? "WFH" : "Present"}.`,
  ].filter(Boolean);
  return { success: true as const, time, message: notes.length ? notes.join(" ") : null };
}

export async function recordClockOut(input: {
  employeeId: string;
  at?: Date;
  location?: GeoPoint | null;
  ignoreAccuracy?: boolean;
}) {
  const { employeeId, ignoreAccuracy = false } = input;
  const office = await getOfficeFor(employeeId);
  const now = input.at ?? new Date();
  const today = todayKey(office.timezone, now);

  const openOnDate = await findOpenSessionOnDate(employeeId, today);
  const open = openOnDate ?? await findOpenSession(employeeId);
  if (!open?.checkInAt) throw new UserError("You haven't clocked in today.");
  if (isSessionExpired(toDateKey(open.date), today)) {
    await markMissedCheckout(open.id);
    throw new UserError(
      `You clocked in on ${dayLabel(open.date)} at ${formatClock(open.checkInAt, office.timezone)} but didn't clock out before midnight, so that day closed as a missed checkout. Send a time correction with your clock-out time.`,
      );
  }
  if (toDateKey(open.date) !== today) {
    throw new UserError("You haven't clocked in today.");
  }
  if (now <= open.checkInAt) {
    throw new UserError("Clock-out time must be after clock-in time.");
  }

  const point = cleanPoint(input.location, { ignoreAccuracy });
  const location = point ? { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? null } : undefined;
  const minutes = workedMinutes(open.checkInAt, now);
  const coverage = (await getCoverage([employeeId], today, today)).get(employeeId)?.get(today) ?? null;
  const halfDayLeave = coverage?.kind === "LEAVE" && !!coverage.halfDay;
  const rawFlags = checkoutFlags({
    dayKind: open.dayKind,
    checkInMinutes: minutesOfDay(office.timezone, open.checkInAt),
    checkOutMinutes: minutesOfDay(office.timezone, now),
    workStartMinutes: parseHHmm(office.workStart),
    workEndMinutes: parseHHmm(office.workEnd),
    workMinutes: minutes,
  });
  const flags = halfDayLeave ? { ...rawFlags, leftEarly: false, earlyMinutes: null } : rawFlags;

  const decided = halfDayLeave || open.reviewStatus === "APPROVED" || open.reviewStatus === "REJECTED";
  const outcome = decided
    ? null
    : statusForDay({
        dayKind: open.dayKind,
        checkInMinutes: minutesOfDay(office.timezone, open.checkInAt),
        workMinutes: minutes,
        lateAfterMinutes: lateCutoffMinutes(office.lateAfter, office.graceMinutes),
        lateOutcome: office.lateOutcome,
        minFullDayMinutes: office.minFullDayMinutes,
      });

  await db.attendance.update({
    where: { id: open.id },
    data: {
      checkOutAt: now,
      checkOutLocation: location,
      workMinutes: minutes,
      missedCheckout: false,
      ...flags,
      ...(outcome && { status: outcome.status, isLate: outcome.isLate }),
    },
  });
  await db.attendanceEvent.create({
    data: { attendanceId: open.id, employeeId, type: "CHECK_OUT", at: now, location },
  });

  const shortDay = outcome?.status === "HALF_DAY" && office.minFullDayMinutes != null && minutes < office.minFullDayMinutes;
  return {
    success: true,
    time: formatClock(now, office.timezone),
    workMinutes: minutes,
    earlyMinutes: flags.earlyMinutes,
    overtimeMinutes: flags.overtimeMinutes,
    message: shortDay ? `Under ${office.minFullDayMinutes! / 60} hours today, so it counts as a half day for now. An approver can review it.` : null,
  };
}
