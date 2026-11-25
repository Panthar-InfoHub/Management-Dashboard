// Attendance reads. Live data, never cached; office and calendar settings come
// from the cached readers in ./settings.
import { cache } from "react";
import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { getCalendarDays, getOffices, type OfficeSettings } from "@/lib/attendance/settings";
import { dayKindFor, eachDateKey, fromDateKey, todayKey, toDateKey, type DayKindValue, type WeekPattern } from "@/lib/attendance/calendar";
import { formatTime, isSessionExpired, statusForEmptyDay, type AttendanceStatusValue } from "@/lib/attendance/rules";

/** The office an employee clocks in at: their own, else the default. */
export const getOfficeFor = cache(async (employeeId: string): Promise<OfficeSettings> => {
  const [offices, employee] = await Promise.all([
    getOffices(),
    db.employee.findUnique({ where: { id: employeeId }, select: { officeId: true } }),
  ]);
  const office = offices.find((o) => o.id === employee?.officeId) ?? offices.find((o) => o.isDefault) ?? offices[0];
  if (!office) throw new Error("No office is set up. Ask an admin to add one in Settings → Office.");
  return office;
});

/** Dated overrides that apply to this office, keyed by "YYYY-MM-DD". */
async function overridesFor(office: OfficeSettings, fromKey: string, toKey: string) {
  const days = await getCalendarDays(fromKey, toKey);
  const map = new Map<string, DayKindValue>();
  // Office-specific rows win over company-wide ones.
  for (const d of days) if (d.officeId === null) map.set(d.date, d.kind);
  for (const d of days) if (d.officeId === office.id) map.set(d.date, d.kind);
  return map;
}

export async function dayKindOn(office: OfficeSettings, dateKey: string): Promise<DayKindValue> {
  return dayKindFor(dateKey, office.weekPattern as WeekPattern, await overridesFor(office, dateKey, dateKey));
}

type AttendanceRow = {
  date: Date;
  status: AttendanceStatusValue;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workMinutes: number | null;
  isLate: boolean;
  missedCheckout: boolean;
  leftEarly: boolean;
  earlyMinutes: number | null;
  overtimeMinutes: number | null;
  reviewStatus: string | null;
};

function presentRow(row: AttendanceRow, timeZone: string, today: string) {
  // A day ends at midnight: an earlier day still open shows as a missed
  // checkout even before anything has written that to the row.
  const expiredOpen = !!row.checkInAt && !row.checkOutAt && isSessionExpired(toDateKey(row.date), today);
  return {
    status: row.status,
    checkIn: row.checkInAt ? formatTime(row.checkInAt, timeZone) : null,
    checkOut: row.checkOutAt ? formatTime(row.checkOutAt, timeZone) : null,
    workMinutes: row.workMinutes,
    isLate: row.isLate,
    missedCheckout: row.missedCheckout || expiredOpen,
    leftEarly: row.leftEarly,
    earlyMinutes: row.earlyMinutes,
    overtimeMinutes: row.overtimeMinutes,
    reviewPending: row.reviewStatus === "PENDING",
  };
}

const EMPTY_ROW = {
  checkIn: null, checkOut: null, workMinutes: null, isLate: false, missedCheckout: false,
  leftEarly: false, earlyMinutes: null, overtimeMinutes: null, reviewPending: false,
} as const;

const rowSelect = {
  date: true, status: true, checkInAt: true, checkOutAt: true, workMinutes: true,
  isLate: true, missedCheckout: true, leftEarly: true, earlyMinutes: true, overtimeMinutes: true, reviewStatus: true,
} as const;

/** The latest clock-in without a clock-out that hasn't been closed as missed. */
export async function findOpenSession(employeeId: string) {
  return db.attendance.findFirst({
    where: { employeeId, checkInAt: { not: null }, checkOutAt: null, missedCheckout: false },
    orderBy: { date: "desc" },
    select: { id: true, date: true, checkInAt: true, dayKind: true, reviewStatus: true },
  });
}

/** The dashboard clock card. Null for people who aren't tracked (Super Admins). */
export async function getMyToday(employee: AuthEmployee) {
  if (!tracksAttendance(employee.role)) return null;
  const office = await getOfficeFor(employee.id);
  const dateKey = todayKey(office.timezone);
  const [dayKind, record] = await Promise.all([
    dayKindOn(office, dateKey),
    db.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } }, select: rowSelect }),
  ]);

  return {
    dateKey,
    dayKind,
    office: {
      name: office.name, radiusMeters: office.radiusMeters, workStart: office.workStart, workEnd: office.workEnd,
      lateAfter: office.lateAfter, lateOutcome: office.lateOutcome,
    },
    record: record ? presentRow(record as AttendanceRow, office.timezone, dateKey) : null,
  };
}

/** One person's month, every day filled in. `monthKey` is "YYYY-MM". */
export async function getMonth(employeeId: string, monthKey: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error("Invalid month.");
  const office = await getOfficeFor(employeeId);
  const [year, month] = monthKey.split("-").map(Number);
  const first = `${monthKey}-01`;
  const last = toDateKey(new Date(Date.UTC(year, month, 0)));
  const today = todayKey(office.timezone);

  const [overrides, rows] = await Promise.all([
    overridesFor(office, first, last),
    db.attendance.findMany({
      where: { employeeId, date: { gte: fromDateKey(first), lte: fromDateKey(last) } },
      select: rowSelect,
    }),
  ]);
  const byDate = new Map(rows.map((r) => [toDateKey(r.date), r]));

  return {
    monthKey,
    today,
    timeZone: office.timezone,
    days: eachDateKey(first, last).map((dateKey) => {
      const dayKind = dayKindFor(dateKey, office.weekPattern as WeekPattern, overrides);
      const row = byDate.get(dateKey);
      return {
        dateKey,
        dayKind,
        isToday: dateKey === today,
        isFuture: dateKey > today,
        ...(row
          ? presentRow(row as AttendanceRow, office.timezone, today)
          : { status: statusForEmptyDay(dayKind, dateKey < today), ...EMPTY_ROW }),
      };
    }),
  };
}

/**
 * Today for a group: everyone (attendance:view-all) or the teams the viewer
 * leads. Null when the viewer can see nobody else.
 */
export async function getTodayBoard(viewer: AuthEmployee) {
  const canViewAll = await hasPermission(viewer, "attendance:view-all");
  const ledTeams = canViewAll ? [] : await db.team.findMany({ where: { leadId: viewer.id }, select: { id: true, name: true } });
  if (!canViewAll && ledTeams.length === 0) return null;

  const people = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      role: { not: "SUPER_ADMIN" },
      ...(canViewAll ? {} : { teamId: { in: ledTeams.map((t) => t.id) } }),
    },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true, officeId: true, team: { select: { name: true } } },
  });

  const offices = await getOffices();
  const defaultOffice = offices.find((o) => o.isDefault) ?? offices[0];
  if (!defaultOffice) throw new Error("No office is set up. Ask an admin to add one in Settings → Office.");
  const dateKey = todayKey(defaultOffice.timezone);

  const records = await db.attendance.findMany({
    where: { date: fromDateKey(dateKey), employeeId: { in: people.map((p) => p.id) } },
    select: { employeeId: true, ...rowSelect },
  });
  const byEmployee = new Map(records.map((r) => [r.employeeId, r]));

  const dayKinds = new Map<string, DayKindValue>();
  for (const office of offices) dayKinds.set(office.id, await dayKindOn(office, dateKey));

  const rows = people.map((p) => {
    const office = offices.find((o) => o.id === p.officeId) ?? defaultOffice;
    const record = byEmployee.get(p.id);
    return {
      employee: { id: p.id, name: `${p.firstName} ${p.lastName}`, avatarUrl: p.avatarUrl, designation: p.designation, team: p.team?.name ?? null },
      dayKind: dayKinds.get(office.id) ?? "OFFICE",
      ...(record ? presentRow(record as AttendanceRow, office.timezone, dateKey) : { status: null, ...EMPTY_ROW }),
    };
  });

  return {
    dateKey,
    scope: canViewAll ? "Everyone" : ledTeams.map((t) => t.name).join(", "),
    rows,
  };
}
