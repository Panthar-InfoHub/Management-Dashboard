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
import { getCoverage, type Coverage } from "@/lib/leave/queries";
import { trackedFrom } from "@/lib/attendance/policy";
import { inAnyTeam } from "@/lib/teams/membership";

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

/** What each day in a range is for an office (week pattern + overrides). */
export async function dayKindsBetween(office: OfficeSettings, fromKey: string, toKey: string) {
  const overrides = await overridesFor(office, fromKey, toKey);
  return eachDateKey(fromKey, toKey).map((dateKey) => ({ dateKey, dayKind: dayKindFor(dateKey, office.weekPattern as WeekPattern, overrides) }));
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

/** Approved WFH turns an office day into a WFH day for that person. */
function withCoverage(dayKind: DayKindValue, coverage: Coverage | null | undefined): DayKindValue {
  return coverage?.kind === "WFH" && dayKind === "OFFICE" ? "WFH" : dayKind;
}

/**
 * A day with no attendance row: approved full-day leave shows as On Leave;
 * days before tracking started (or before they joined) are blank.
 */
function emptyStatus(dayKind: DayKindValue, coverage: Coverage | null | undefined, isPast: boolean, beforeStart = false): AttendanceStatusValue | null {
  if (beforeStart) return null;
  if (coverage?.kind === "LEAVE") return coverage.halfDay && isPast ? "HALF_DAY" : "ON_LEAVE";
  return statusForEmptyDay(dayKind, isPast);
}

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
  const [baseKind, record, coverage] = await Promise.all([
    dayKindOn(office, dateKey),
    db.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } }, select: rowSelect }),
    getCoverage([employee.id], dateKey, dateKey).then((m) => m.get(employee.id)?.get(dateKey) ?? null),
  ]);

  return {
    dateKey,
    dayKind: withCoverage(baseKind, coverage),
    leave: coverage?.kind === "LEAVE" ? { typeName: coverage.typeName, halfDay: coverage.halfDay } : null,
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

  const [overrides, rows, coverageMap, person] = await Promise.all([
    overridesFor(office, first, last),
    db.attendance.findMany({
      where: { employeeId, date: { gte: fromDateKey(first), lte: fromDateKey(last) } },
      select: rowSelect,
    }),
    getCoverage([employeeId], first, last),
    db.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } }),
  ]);
  const coverage = coverageMap.get(employeeId);
  const startKey = trackedFrom(person ? toDateKey(person.joinDate) : null);
  const byDate = new Map(rows.map((r) => [toDateKey(r.date), r]));

  return {
    monthKey,
    today,
    timeZone: office.timezone,
    days: eachDateKey(first, last).map((dateKey) => {
      const cover = coverage?.get(dateKey);
      const dayKind = withCoverage(dayKindFor(dateKey, office.weekPattern as WeekPattern, overrides), cover);
      const row = byDate.get(dateKey);
      return {
        dateKey,
        dayKind,
        isToday: dateKey === today,
        isFuture: dateKey > today,
        ...(row
          ? presentRow(row as AttendanceRow, office.timezone, today)
          : { status: emptyStatus(dayKind, cover, dateKey < today, dateKey < startKey), ...EMPTY_ROW }),
        leave: cover?.kind === "LEAVE" ? { typeName: cover.typeName, halfDay: cover.halfDay } : null,
      };
    }),
  };
}

/**
 * Whose attendance the viewer can see: everyone (attendance:view-all) or the
 * teams they lead. Null when they can see nobody else.
 */
export async function getAttendanceScope(viewer: AuthEmployee) {
  const canViewAll = await hasPermission(viewer, "attendance:view-all");
  if (canViewAll) return { all: true as const, teams: [] as { id: string; name: string }[], label: "Everyone" };
  const teams = await db.team.findMany({ where: { leadId: viewer.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return teams.length ? { all: false as const, teams, label: teams.map((t) => t.name).join(", ") } : null;
}

type Scope = NonNullable<Awaited<ReturnType<typeof getAttendanceScope>>>;

async function scopedPeople(scope: Scope, teamId?: string | null) {
  const teamFilter = teamId && (scope.all || scope.teams.some((t) => t.id === teamId))
    ? inAnyTeam([teamId])
    : scope.all ? {} : inAnyTeam(scope.teams.map((t) => t.id));
  return db.employee.findMany({
    where: { status: "ACTIVE", role: { not: "SUPER_ADMIN" }, ...teamFilter },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true, officeId: true, joinDate: true, teamMemberships: { select: { team: { select: { name: true } } }, orderBy: { joinedAt: "asc" } } },
  });
}

/**
 * Everyone in scope for a range of days: one query each for offices,
 * calendar overrides, attendance rows and approved leave/WFH.
 */
async function groupDays(people: Awaited<ReturnType<typeof scopedPeople>>, fromKey: string, toKey: string) {
  const offices = await getOffices();
  const defaultOffice = offices.find((o) => o.isDefault) ?? offices[0];
  if (!defaultOffice) throw new Error("No office is set up. Ask an admin to add one in Settings → Office.");
  const today = todayKey(defaultOffice.timezone);

  const [rows, coverage, kindsByOffice] = await Promise.all([
    db.attendance.findMany({
      where: { employeeId: { in: people.map((p) => p.id) }, date: { gte: fromDateKey(fromKey), lte: fromDateKey(toKey) } },
      select: { employeeId: true, ...rowSelect },
    }),
    getCoverage(people.map((p) => p.id), fromKey, toKey),
    Promise.all(offices.map(async (o) => [o.id, await overridesFor(o, fromKey, toKey)] as const)),
  ]);
  const overrides = new Map(kindsByOffice);
  const byKey = new Map(rows.map((r) => [`${r.employeeId}|${toDateKey(r.date)}`, r]));
  const dateKeys = eachDateKey(fromKey, toKey);

  return {
    today,
    dateKeys,
    people: people.map((p) => {
      const office = offices.find((o) => o.id === p.officeId) ?? defaultOffice;
      const cover = coverage.get(p.id);
      const startKey = trackedFrom(toDateKey(p.joinDate));
      const days = dateKeys.map((dateKey) => {
        const c = cover?.get(dateKey);
        const dayKind = withCoverage(dayKindFor(dateKey, office.weekPattern as WeekPattern, overrides.get(office.id) ?? new Map()), c);
        const row = byKey.get(`${p.id}|${dateKey}`);
        const isPast = dateKey < today;
        return {
          dateKey,
          dayKind,
          isFuture: dateKey > today,
          leave: c?.kind === "LEAVE" ? { typeName: c.typeName, halfDay: c.halfDay } : null,
          ...(row
            ? presentRow(row as AttendanceRow, office.timezone, today)
            : { status: emptyStatus(dayKind, c, isPast, dateKey < startKey), ...EMPTY_ROW }),
        };
      });
      return {
        employee: { id: p.id, name: `${p.firstName} ${p.lastName}`, avatarUrl: p.avatarUrl, designation: p.designation, team: p.teamMemberships.map((m) => m.team.name).join(", ") || null },
        days,
      };
    }),
  };
}

/** One day for a group (today by default). Past working days with nothing recorded are Absent. */
export async function getTodayBoard(viewer: AuthEmployee, dateKey?: string) {
  const scope = await getAttendanceScope(viewer);
  if (!scope) return null;
  const people = await scopedPeople(scope);
  const offices = await getOffices();
  const today = todayKey((offices.find((o) => o.isDefault) ?? offices[0])?.timezone ?? "Asia/Kolkata");
  const day = dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dateKey <= today ? dateKey : today;
  const group = await groupDays(people, day, day);

  return {
    dateKey: day,
    isToday: day === today,
    canEdit: await hasPermission(viewer, "attendance:edit"),
    viewerId: viewer.id,
    scope: scope.label,
    rows: group.people.map(({ employee, days }) => ({ employee, ...days[0] })),
  };
}

/** A month for a group: people × days. `monthKey` is "YYYY-MM". */
export async function getTeamMonth(viewer: AuthEmployee, monthKey: string, teamId?: string | null) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error("Invalid month.");
  const scope = await getAttendanceScope(viewer);
  if (!scope) return null;
  const [year, month] = monthKey.split("-").map(Number);
  const first = `${monthKey}-01`;
  const last = toDateKey(new Date(Date.UTC(year, month, 0)));
  const [people, teams] = await Promise.all([
    scopedPeople(scope, teamId),
    scope.all ? db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve(scope.teams),
  ]);
  const group = await groupDays(people, first, last);
  return { monthKey, scope: scope.label, teams, teamId: teamId ?? null, ...group };
}
