"use server";
import { UserError } from "@/lib/errors";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/access";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { eachDateKey, fromDateKey, parseHHmm, type DayKindValue, type WeekPattern } from "@/lib/attendance/calendar";
import { audit } from "@/lib/audit";
import { recalculateBalances, recomputeRequestDays } from "@/lib/leave/balances";
import { parseHolidayIcs } from "@/lib/attendance/holiday-ics";
import { todayKey, toDateKey } from "@/lib/attendance/calendar";
import { proratedAllowance } from "@/lib/leave/rules";
import { LEAVE_TRACKING_START } from "@/lib/leave/policy";
import { hasPermission } from "@/lib/permissions";
import { cleanAnnouncement, publishAnnouncement } from "@/lib/announcements/publish";

const DAY_KINDS: DayKindValue[] = ["OFFICE", "WFH", "OFF", "HOLIDAY"];

function done(tag: string) {
  updateTag(tag);
  revalidatePath("/settings");
  revalidatePath("/calendar");
}

// ─── Office (Admins only) ───

export async function updateOfficeAction(officeId: string, data: {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStart: string;
  workEnd: string;
  lateAfter: string;
  lateOutcome: "HALF_DAY" | "LATE";
  minFullDayMinutes: number | null;
  graceMinutes: number;
  weekPattern: WeekPattern;
}) {
  const actor = await getCurrentEmployee();
  if (!isAdminRole(actor.role)) throw new UserError("Only Admins can change office settings.");

  const name = data.name?.trim();
  if (!name) throw new UserError("Office name is required.");
  if (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90) throw new UserError("Latitude must be between -90 and 90.");
  if (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180) throw new UserError("Longitude must be between -180 and 180.");
  if (!Number.isInteger(data.radiusMeters) || data.radiusMeters < 20 || data.radiusMeters > 5000) {
    throw new UserError("Radius must be a whole number between 20 and 5000 metres.");
  }
  const start = parseHHmm(data.workStart), end = parseHHmm(data.workEnd), late = parseHHmm(data.lateAfter);
  if (end <= start) throw new UserError("Office end must be after office start.");
  if (late < start || late >= end) throw new UserError("The late cut-off must be within office hours.");
  if (data.lateOutcome !== "HALF_DAY" && data.lateOutcome !== "LATE") throw new UserError("Late outcome must be Half Day or Late.");
  if (data.minFullDayMinutes !== null && (!Number.isInteger(data.minFullDayMinutes) || data.minFullDayMinutes < 30 || data.minFullDayMinutes > 16 * 60)) {
    throw new UserError("Minimum hours for a full day must be between 0.5 and 16, or empty to turn the rule off.");
  }
  if (!Number.isInteger(data.graceMinutes) || data.graceMinutes < 0 || data.graceMinutes > 120) {
    throw new UserError("Grace must be a whole number of minutes, 0 to 120.");
  }
  if (data.weekPattern.length !== 7 || data.weekPattern.some((d) => !["OFFICE", "WFH", "OFF"].includes(d))) {
    throw new UserError("Each weekday must be Office, WFH or Off.");
  }

  const before = await db.office.findUnique({ where: { id: officeId } });
  if (!before) throw new UserError("Office not found.");

  const office = await db.office.update({
    where: { id: officeId },
    data: {
      name,
      address: data.address?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
      workStart: data.workStart,
      workEnd: data.workEnd,
      lateAfter: data.lateAfter,
      lateOutcome: data.lateOutcome,
      minFullDayMinutes: data.minFullDayMinutes,
      graceMinutes: data.graceMinutes,
      weekPattern: data.weekPattern,
    },
  });

  audit({
    actorId: actor.id, entity: "Office", entityId: officeId, action: "update",
    changes: JSON.parse(JSON.stringify({ before: { lateAfter: before.lateAfter, lateOutcome: before.lateOutcome, weekPattern: before.weekPattern, radiusMeters: before.radiusMeters }, after: data })),
  });
  done(CACHE_TAGS.offices);
  if (JSON.stringify(before.weekPattern) !== JSON.stringify(data.weekPattern)) {
    const year = Number(todayKey(office.timezone).slice(0, 4));
    await recomputeRequestDays(`${year}-01-01`, `${year + 1}-12-31`);
  }
  return office;
}

// ─── Calendar days: holidays and one-off overrides (leave:manage) ───

const MAX_RANGE_DAYS = 31;

/**
 * Set one day, or a run of days (e.g. a Diwali break), company-wide. Each date
 * in the range gets its own row, so single days can still be removed later.
 */
/**
 * Set a date (or range) to a kind of day. With `announce`, also post an
 * announcement to everyone (in-app and email), pinned until the last day ends.
 */
export async function upsertCalendarDayAction(data: { date: string; endDate?: string | null; kind: DayKindValue; name?: string | null; announce?: { title: string; body: string } | null }) {
  const actor = await requireAuth("leave:manage");
  if (!DAY_KINDS.includes(data.kind)) throw new UserError("Choose Holiday, Office day, WFH or Off.");
  const name = data.name?.trim() || null;
  if (data.kind === "HOLIDAY" && !name) throw new UserError("Give the holiday a name, e.g. Diwali.");

  const start = data.date;
  const end = data.endDate || data.date;
  fromDateKey(start); fromDateKey(end);
  if (end < start) throw new UserError("The last day is before the first day.");
  const dates = eachDateKey(start, end);
  if (dates.length > MAX_RANGE_DAYS) throw new UserError(`A range can be at most ${MAX_RANGE_DAYS} days. Split it into two.`);

  // Check the announcement before changing the calendar, so a problem with it saves nothing.
  let announcement: Awaited<ReturnType<typeof cleanAnnouncement>> | null = null;
  if (data.announce) {
    if (!(await hasPermission(actor, "announcement:manage"))) throw new UserError("You can't post announcements. Turn off Announce to Everyone, or ask an admin.");
    if (end < todayKey("Asia/Kolkata")) throw new UserError("These dates have passed, so there's nothing to announce. Turn off Announce to Everyone.");
    announcement = await cleanAnnouncement({ title: data.announce.title, body: data.announce.body, teamIds: [], pinned: true, expiresOn: end });
  }

  const existing = await db.calendarDay.findMany({
    where: { officeId: null, date: { gte: fromDateKey(start), lte: fromDateKey(end) } },
    select: { id: true, date: true },
  });
  const byDate = new Map(existing.map((d) => [d.date.toISOString().slice(0, 10), d.id]));
  await db.$transaction(dates.map((key) => {
    const id = byDate.get(key);
    return id
      ? db.calendarDay.update({ where: { id }, data: { kind: data.kind, name } })
      : db.calendarDay.create({ data: { date: fromDateKey(key), kind: data.kind, name, createdById: actor.id } });
  }));

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: start, action: existing.length ? "update" : "create", changes: { from: start, to: end, days: dates.length, kind: data.kind, name } });
  done(CACHE_TAGS.calendar);
  // A new holiday inside approved or pending leave gives those days back.
  await recomputeRequestDays(start, end);
  const notified = announcement ? (await publishAnnouncement(actor.id, announcement)).notified : null;
  return { success: true, days: dates.length, notified };
}

/** Remove several calendar days at once (a whole range from the list). */
export async function deleteCalendarDaysAction(ids: string[]) {
  const actor = await requireAuth("leave:manage");
  if (!Array.isArray(ids) || ids.length === 0) throw new UserError("Nothing to remove.");
  const days = await db.calendarDay.findMany({ where: { id: { in: ids.slice(0, MAX_RANGE_DAYS * 2) } }, select: { id: true, date: true, kind: true, name: true } });
  if (days.length === 0) throw new UserError("Those days were already removed.");
  await db.calendarDay.deleteMany({ where: { id: { in: days.map((d) => d.id) } } });

  const keys = days.map((d) => d.date.toISOString().slice(0, 10)).sort();
  audit({ actorId: actor.id, entity: "CalendarDay", entityId: keys[0], action: "delete", changes: { dates: keys, kind: days[0].kind, name: days[0].name } });
  done(CACHE_TAGS.calendar);
  await recomputeRequestDays(keys[0], keys[keys.length - 1]);
  return { removed: days.length };
}

// ─── Import public holidays (leave:manage) ───

/** Google's public "Holidays in India" calendar: free, no account or key, nothing about us is sent. */
const INDIA_HOLIDAYS_ICS = "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

/** A year's public holidays and observances, marked with any date already in the calendar. */
export async function previewPublicHolidaysAction(year: number) {
  await requireAuth("leave:manage");
  const thisYear = Number(todayKey("Asia/Kolkata").slice(0, 4));
  if (!Number.isInteger(year) || year < thisYear - 1 || year > thisYear + 3) {
    throw new UserError(`Pick a year from ${thisYear - 1} to ${thisYear + 3}.`);
  }

  let text: string;
  try {
    // Holiday lists change rarely: keep a copy for a day.
    const res = await fetch(INDIA_HOLIDAYS_ICS, { next: { revalidate: 86_400 } });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    throw new UserError("Couldn't reach the public holiday calendar. Check the internet connection and try again, or add holidays by hand.");
  }

  const feed = parseHolidayIcs(text, year);
  const existing = await db.calendarDay.findMany({
    where: { officeId: null, date: { gte: fromDateKey(`${year}-01-01`), lte: fromDateKey(`${year}-12-31`) } },
    select: { date: true, kind: true, name: true },
  });
  const byDate = new Map(existing.map((d) => [d.date.toISOString().slice(0, 10), d]));
  return {
    year,
    holidays: feed.map((h) => {
      const set = byDate.get(h.date);
      return { ...h, existing: set ? { kind: set.kind as DayKindValue, name: set.name } : null };
    }),
  };
}

/**
 * Add chosen holidays company-wide. Dates already in the calendar (a holiday or
 * any other override) are left alone. Leave and WFH requests on those dates
 * give the days back, as with adding a holiday by hand.
 */
export async function importHolidaysAction(items: { date: string; name: string }[]) {
  const actor = await requireAuth("leave:manage");
  if (!Array.isArray(items) || items.length === 0) throw new UserError("Tick at least one holiday.");
  if (items.length > 100) throw new UserError("Import at most 100 days at a time.");

  const clean = items.map((i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date)) throw new UserError("A holiday has an invalid date.");
    const name = i.name?.trim().slice(0, 120);
    if (!name) throw new UserError("Every holiday needs a name.");
    return { date: i.date, name };
  });
  const unique = [...new Map(clean.map((i) => [i.date, i])).values()];

  const taken = new Set(
    (await db.calendarDay.findMany({ where: { officeId: null, date: { in: unique.map((i) => fromDateKey(i.date)) } }, select: { date: true } }))
      .map((d) => d.date.toISOString().slice(0, 10))
  );
  const toAdd = unique.filter((i) => !taken.has(i.date));
  if (toAdd.length > 0) {
    await db.calendarDay.createMany({
      data: toAdd.map((i) => ({ date: fromDateKey(i.date), kind: "HOLIDAY" as const, name: i.name, createdById: actor.id })),
      skipDuplicates: true,
    });
    audit({ actorId: actor.id, entity: "CalendarDay", entityId: "import", action: "import", changes: { added: toAdd.map((i) => `${i.date} ${i.name}`) } });
    done(CACHE_TAGS.calendar);
    const dates = toAdd.map((i) => i.date).sort();
    await recomputeRequestDays(dates[0], dates[dates.length - 1]);
  }
  return { added: toAdd.length, skipped: unique.length - toAdd.length };
}

export async function deleteCalendarDayAction(id: string) {
  const actor = await requireAuth("leave:manage");
  const day = await db.calendarDay.findUnique({ where: { id } });
  if (!day) throw new UserError("That day was already removed.");
  await db.calendarDay.delete({ where: { id } });

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: id, action: "delete", changes: { date: day.date.toISOString().slice(0, 10), kind: day.kind, name: day.name } });
  done(CACHE_TAGS.calendar);
  await recomputeRequestDays(day.date.toISOString().slice(0, 10), day.date.toISOString().slice(0, 10));
  return { success: true };
}

// ─── Leave types (leave:manage) ───

type LeaveTypeInput = { name: string; yearlyDays: number | null; isPaid: boolean; isActive: boolean };

function cleanLeaveType(data: LeaveTypeInput) {
  const name = data.name?.trim();
  if (!name) throw new UserError("Leave type name is required.");
  const halfStep = (n: number) => Number.isFinite(n) && n >= 0 && n <= 365 && Number.isInteger(n * 2);
  if (data.yearlyDays !== null && !halfStep(data.yearlyDays)) throw new UserError("Days per year must be 0–365, in steps of 0.5.");
  return { name, yearlyDays: data.yearlyDays, isPaid: !!data.isPaid, isActive: !!data.isActive };
}

export async function createLeaveTypeAction(data: LeaveTypeInput) {
  const actor = await requireAuth("leave:manage");
  const clean = cleanLeaveType(data);
  if (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } })) {
    throw new UserError(`A leave type named “${clean.name}” already exists.`);
  }
  const last = await db.leaveType.aggregate({ _max: { sortOrder: true } });
  const type = await db.leaveType.create({ data: { ...clean, sortOrder: (last._max.sortOrder ?? 0) + 1 } });

  audit({ actorId: actor.id, entity: "LeaveType", entityId: type.id, action: "create", changes: clean });
  done(CACHE_TAGS.leaveTypes);
  return type;
}

/**
 * Before a limit is lowered (or a no-limit type gets one): who would end up
 * over the new limit this year, counting approved and pending leave.
 */
export async function previewLeaveLimitAction(id: string, yearlyDays: number | null) {
  await requireAuth("leave:manage");
  if (yearlyDays === null) return { year: 0, over: [] as { name: string; overBy: number }[] };
  const year = Number(todayKey("Asia/Kolkata").slice(0, 4));
  const start = fromDateKey(`${year}-01-01`), end = fromDateKey(`${year}-12-31`);
  const [taken, adjustments] = await Promise.all([
    db.request.groupBy({
      by: ["employeeId"],
      where: { leaveTypeId: id, kind: "LEAVE", status: { in: ["APPROVED", "PENDING"] }, startDate: { gte: start, lte: end } },
      _sum: { days: true },
    }),
    db.leaveBalance.findMany({ where: { leaveTypeId: id, year }, select: { employeeId: true, adjusted: true } }),
  ]);
  if (taken.length === 0) return { year, over: [] };
  const people = await db.employee.findMany({
    where: { id: { in: taken.map((t) => t.employeeId) }, status: { not: "INACTIVE" } },
    select: { id: true, firstName: true, lastName: true, joinDate: true },
  });
  const over = people
    .map((p) => {
      const joinKey = toDateKey(p.joinDate);
      const allowed = proratedAllowance(yearlyDays, year, joinKey > LEAVE_TRACKING_START ? joinKey : LEAVE_TRACKING_START);
      const adjusted = adjustments.find((a) => a.employeeId === p.id)?.adjusted ?? 0;
      const used = taken.find((t) => t.employeeId === p.id)?._sum.days ?? 0;
      return { name: `${p.firstName} ${p.lastName}`.trim(), overBy: used - allowed - adjusted };
    })
    .filter((r) => r.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy);
  return { year, over };
}

/** Leave types are never deleted (requests point at them); set isActive false instead. */
export async function updateLeaveTypeAction(id: string, data: LeaveTypeInput) {
  const actor = await requireAuth("leave:manage");
  const clean = cleanLeaveType(data);
  const before = await db.leaveType.findUnique({ where: { id } });
  if (!before) throw new UserError("Leave type not found.");
  if (clean.name !== before.name && (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } }))) {
    throw new UserError(`A leave type named “${clean.name}” already exists.`);
  }
  const type = await db.leaveType.update({ where: { id }, data: clean });

  audit({ actorId: actor.id, entity: "LeaveType", entityId: id, action: "update", changes: JSON.parse(JSON.stringify({ before, after: clean })) });
  done(CACHE_TAGS.leaveTypes);
  if (before.yearlyDays !== clean.yearlyDays) {
    const year = Number(todayKey("Asia/Kolkata").slice(0, 4));
    await recalculateBalances("ALL", year);
    await recalculateBalances("ALL", year + 1);
  }
  return type;
}
