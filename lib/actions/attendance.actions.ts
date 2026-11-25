"use server";

// Clock in / clock out. A day ends at midnight (office time): a clock-in with
// no clock-out by then becomes a missed checkout, without hours, fixed later
// by an attendance-fix request. Clock-out sets left-early or overtime against
// office hours.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";
import { getCurrentEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { fromDateKey, minutesOfDay, parseHHmm, todayKey, toDateKey } from "@/lib/attendance/calendar";
import {
  checkGeofence, checkoutFlags, formatTime, isSessionExpired, statusForCheckIn, statusForDay, workedMinutes,
  MAX_LOCATION_ACCURACY_M, type GeoPoint,
} from "@/lib/attendance/rules";
import { dayKindOn, findOpenSession, getOfficeFor } from "@/lib/attendance/queries";
import { getCoverage } from "@/lib/leave/queries";
import type { OfficeSettings } from "@/lib/attendance/settings";

function cleanPoint(point: GeoPoint | null | undefined): GeoPoint | null {
  if (!point) return null;
  const lat = Number(point.lat), lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const accuracy = point.accuracy == null ? null : Number(point.accuracy);
  return { lat, lng, accuracy: Number.isFinite(accuracy) ? accuracy : null };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/attendance");
  revalidatePath("/attendance/today");
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

async function requireTracked() {
  const employee = await getCurrentEmployee();
  if (!tracksAttendance(employee.role)) throw new Error("Super Admins don't clock in.");
  return employee;
}

/** Office days need a location inside the geofence; other days just record it if given. */
function locationFor(dayKind: string, point: GeoPoint | null, office: OfficeSettings) {
  const base = point ? { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? null } : null;
  if (dayKind !== "OFFICE") return base;
  const fence = checkGeofence(point, office);
  if (!fence.ok) {
    if (fence.reason === "outside") {
      throw new Error(`You're ${fence.distanceMeters} m from ${office.name}; clock-in works within ${office.radiusMeters} m. If you're working from home today, ask for WFH.`);
    }
    throw new Error(GEOFENCE_MESSAGES[fence.reason]);
  }
  return { ...base, distanceMeters: fence.distanceMeters, inside: true };
}

export async function clockInAction(input: { location?: GeoPoint | null }) {
  const employee = await requireTracked();
  const office = await getOfficeFor(employee.id);
  const now = new Date();
  const dateKey = todayKey(office.timezone, now);
  const date = fromDateKey(dateKey);

  // 1. Already in today? Blocked. Open from an earlier day? Close it as missed.
  let closedMissed: string | null = null;
  const open = await findOpenSession(employee.id);
  if (open?.checkInAt) {
    if (!isSessionExpired(toDateKey(open.date), dateKey)) {
      throw new Error(`You already clocked in today at ${formatTime(open.checkInAt, office.timezone)}.`);
    }
    await markMissedCheckout(open.id);
    closedMissed = dayLabel(open.date);
  }

  // Approved leave or WFH for today changes what the day is for this person.
  const [baseKind, coverage] = await Promise.all([
    dayKindOn(office, dateKey),
    getCoverage([employee.id], dateKey, dateKey).then((m) => m.get(employee.id)?.get(dateKey) ?? null),
  ]);
  if (coverage?.kind === "LEAVE" && !coverage.halfDay) {
    throw new Error(`You're on ${coverage.typeName ?? "leave"} today. Cancel the leave first if you're working.`);
  }
  const halfDayLeave = coverage?.kind === "LEAVE" && !!coverage.halfDay;
  const dayKind = coverage?.kind === "WFH" && baseKind === "OFFICE" ? "WFH" : baseKind;
  const location = locationFor(dayKind, cleanPoint(input.location), office);

  // 2. Clocked out earlier today and back again: reopen the day.
  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
    select: { id: true, checkInAt: true, checkOutAt: true },
  });
  if (existing?.checkInAt && existing.checkOutAt) {
    await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutAt: null, checkOutLocation: Prisma.DbNull, workMinutes: null, missedCheckout: false,
        leftEarly: false, earlyMinutes: null, overtimeMinutes: null,
      },
    });
    await db.attendanceEvent.create({
      data: { attendanceId: existing.id, employeeId: employee.id, type: "CHECK_IN", at: now, location: location ?? undefined, note: "Clocked in again" },
    });
    refresh();
    return {
      success: true,
      time: formatTime(now, office.timezone),
      message: `Clocked in again. Hours count from your first clock-in at ${formatTime(existing.checkInAt, office.timezone)}.`,
    };
  }

  // 3. First clock-in of the day.
  // A half-day leave is a half day already: no late rule, nothing to review.
  const outcome = halfDayLeave
    ? { status: "HALF_DAY" as const, isLate: false, needsReview: false }
    : statusForCheckIn({
        dayKind,
        minutesNow: minutesOfDay(office.timezone, now),
        lateAfterMinutes: parseHHmm(office.lateAfter),
        lateOutcome: office.lateOutcome,
      });
  const data = {
    officeId: office.id,
    status: outcome.status,
    dayKind,
    checkInAt: now,
    checkInLocation: location ?? undefined,
    isLate: outcome.isLate,
    reviewStatus: outcome.needsReview ? ("PENDING" as const) : null,
  };

  let recordId: string;
  try {
    const record = existing
      ? await db.attendance.update({ where: { id: existing.id }, data })
      : await db.attendance.create({ data: { ...data, employeeId: employee.id, date } });
    recordId = record.id;
  } catch (err) {
    // Two clicks at once: the second insert hits the one-row-per-day constraint.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("You already clocked in today.");
    }
    throw err;
  }

  await db.attendanceEvent.create({
    data: { attendanceId: recordId, employeeId: employee.id, type: "CHECK_IN", at: now, location: location ?? undefined },
  });

  refresh();
  const notes = [
    closedMissed && `${closedMissed} had no clock-out, so it closed as a missed checkout. Ask for an attendance fix.`,
    outcome.needsReview && `Clocked in after ${office.lateAfter}, so today is a half day for now. An approver can review it.`,
  ].filter(Boolean);
  return { success: true, time: formatTime(now, office.timezone), message: notes.length ? notes.join(" ") : null };
}

export async function clockOutAction(input: { location?: GeoPoint | null }) {
  const employee = await requireTracked();
  const office = await getOfficeFor(employee.id);
  const now = new Date();
  const today = todayKey(office.timezone, now);

  const open = await findOpenSession(employee.id);
  if (!open?.checkInAt) throw new Error("You haven't clocked in today.");
  if (isSessionExpired(toDateKey(open.date), today)) {
    // Clocked in on an earlier day and the day ended at midnight.
    await markMissedCheckout(open.id);
    refresh();
    throw new Error(
      `You clocked in on ${dayLabel(open.date)} at ${formatTime(open.checkInAt, office.timezone)} but didn't clock out before midnight, so that day closed as a missed checkout. Ask for an attendance fix.`
    );
  }

  const point = cleanPoint(input.location);
  const location = point ? { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? null } : undefined;
  const minutes = workedMinutes(open.checkInAt, now);
  const coverage = (await getCoverage([employee.id], today, today)).get(employee.id)?.get(today) ?? null;
  const halfDayLeave = coverage?.kind === "LEAVE" && !!coverage.halfDay;
  const rawFlags = checkoutFlags({
    dayKind: open.dayKind,
    checkInMinutes: minutesOfDay(office.timezone, open.checkInAt),
    checkOutMinutes: minutesOfDay(office.timezone, now),
    workStartMinutes: parseHHmm(office.workStart),
    workEndMinutes: parseHHmm(office.workEnd),
    workMinutes: minutes,
  });
  // Leaving at mid-day is expected on a half-day leave.
  const flags = halfDayLeave ? { ...rawFlags, leftEarly: false, earlyMinutes: null } : rawFlags;

  // Re-evaluate with the hours worked (optional short-day rule), unless an
  // approver already decided this day.
  const decided = halfDayLeave || open.reviewStatus === "APPROVED" || open.reviewStatus === "REJECTED";
  const outcome = decided
    ? null
    : statusForDay({
        dayKind: open.dayKind,
        checkInMinutes: minutesOfDay(office.timezone, open.checkInAt),
        workMinutes: minutes,
        lateAfterMinutes: parseHHmm(office.lateAfter),
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
      ...(outcome && { status: outcome.status, isLate: outcome.isLate, reviewStatus: outcome.needsReview ? "PENDING" : null }),
    },
  });
  await db.attendanceEvent.create({
    data: { attendanceId: open.id, employeeId: employee.id, type: "CHECK_OUT", at: now, location },
  });

  refresh();
  const shortDay = outcome?.status === "HALF_DAY" && office.minFullDayMinutes != null && minutes < office.minFullDayMinutes;
  return {
    success: true,
    time: formatTime(now, office.timezone),
    workMinutes: minutes,
    earlyMinutes: flags.earlyMinutes,
    overtimeMinutes: flags.overtimeMinutes,
    message: shortDay ? `Under ${office.minFullDayMinutes! / 60} hours today, so it counts as a half day for now. An approver can review it.` : null,
  };
}
