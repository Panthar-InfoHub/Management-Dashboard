// Leave and request reads: balances, approved coverage, my requests, inbox.
import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { getLeaveTypes } from "@/lib/attendance/settings";
import { getOfficeFor } from "@/lib/attendance/queries";
import { eachDateKey, fromDateKey, todayKey, toDateKey } from "@/lib/attendance/calendar";
import { formatTime } from "@/lib/attendance/rules";
import { availableDays, proratedAllowance } from "@/lib/leave/rules";
import { inAnyTeam, teamIdsOf } from "@/lib/teams/membership";
import { LEAVE_TRACKING_START, leaveYearOf } from "@/lib/leave/policy";

export type Coverage = { kind: "LEAVE" | "WFH"; halfDay: "FIRST_HALF" | "SECOND_HALF" | null; typeName: string | null };

/** Approved leave and WFH per person per day in a range. */
export async function getCoverage(employeeIds: string[], fromKey: string, toKey: string) {
  const map = new Map<string, Map<string, Coverage>>();
  if (employeeIds.length === 0) return map;
  const rows = await db.request.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: "APPROVED",
      kind: { in: ["LEAVE", "WFH"] },
      startDate: { lte: fromDateKey(toKey) },
      endDate: { gte: fromDateKey(fromKey) },
    },
    select: { employeeId: true, kind: true, startDate: true, endDate: true, halfDay: true, leaveType: { select: { name: true } } },
  });
  for (const r of rows) {
    const from = toDateKey(r.startDate) > fromKey ? toDateKey(r.startDate) : fromKey;
    const to = toDateKey(r.endDate) < toKey ? toDateKey(r.endDate) : toKey;
    const perDay = map.get(r.employeeId) ?? new Map<string, Coverage>();
    for (const dateKey of eachDateKey(from, to)) {
      // Leave wins over WFH on the same day.
      if (perDay.get(dateKey)?.kind === "LEAVE" && r.kind === "WFH") continue;
      perDay.set(dateKey, { kind: r.kind as "LEAVE" | "WFH", halfDay: r.halfDay, typeName: r.leaveType?.name ?? null });
    }
    map.set(r.employeeId, perDay);
  }
  return map;
}

/** Create any missing balances for a year with the prorated allowance. */
export async function ensureBalances(employeeId: string, year: number) {
  const [types, employee, existing] = await Promise.all([
    getLeaveTypes(),
    db.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } }),
    db.leaveBalance.findMany({ where: { employeeId, year }, select: { leaveTypeId: true } }),
  ]);
  if (!employee) return;
  const have = new Set(existing.map((b) => b.leaveTypeId));
  const joinKey = toDateKey(employee.joinDate);
  const startKey = joinKey > LEAVE_TRACKING_START ? joinKey : LEAVE_TRACKING_START;

  const missing = types.filter((t) => t.yearlyDays !== null && !have.has(t.id));
  if (missing.length === 0) return;
  await db.leaveBalance.createMany({
    data: missing.map((t) => ({
      employeeId,
      leaveTypeId: t.id,
      year,
      allowed: proratedAllowance(t.yearlyDays!, year, startKey),
    })),
    skipDuplicates: true,
  });
}

/** Days held by pending leave requests, per leave type, in a year. */
async function pendingDaysByType(employeeId: string, year: number) {
  const rows = await db.request.groupBy({
    by: ["leaveTypeId"],
    where: { employeeId, kind: "LEAVE", status: "PENDING", startDate: { gte: fromDateKey(`${year}-01-01`), lte: fromDateKey(`${year}-12-31`) } },
    _sum: { days: true },
  });
  return new Map(rows.map((r) => [r.leaveTypeId, r._sum.days ?? 0]));
}

export async function getBalances(employeeId: string, year: number) {
  await ensureBalances(employeeId, year);
  const [types, balances, pending] = await Promise.all([
    getLeaveTypes(),
    db.leaveBalance.findMany({ where: { employeeId, year } }),
    pendingDaysByType(employeeId, year),
  ]);
  return types.map((t) => {
    const b = balances.find((x) => x.leaveTypeId === t.id);
    const pendingDays = pending.get(t.id) ?? 0;
    return {
      leaveTypeId: t.id,
      name: t.name,
      isPaid: t.isPaid,
      unlimited: t.yearlyDays === null,
      allowed: b?.allowed ?? 0,
      adjusted: b?.adjusted ?? 0,
      used: b?.used ?? 0,
      pending: pendingDays,
      available: b ? availableDays(b, pendingDays) : null,
    };
  });
}

const requestSelect = {
  id: true, kind: true, startDate: true, endDate: true, halfDay: true, days: true, reason: true, status: true,
  decidedAt: true, decisionNote: true, fixCheckIn: true, fixCheckOut: true, workMode: true, createdAt: true,
  leaveType: { select: { name: true } },
  decidedBy: { select: { firstName: true, lastName: true } },
} as const;

type RequestRow = {
  id: string; kind: string; startDate: Date; endDate: Date; halfDay: string | null; days: number; reason: string; status: string;
  decidedAt: Date | null; decisionNote: string | null; fixCheckIn: Date | null; fixCheckOut: Date | null; workMode: string | null; createdAt: Date;
  leaveType: { name: string } | null; decidedBy: { firstName: string; lastName: string } | null;
};

function presentRequest(r: RequestRow, timeZone: string, today: string) {
  return {
    id: r.id,
    kind: r.kind as "LEAVE" | "WFH" | "ATTENDANCE_FIX",
    startDate: toDateKey(r.startDate),
    endDate: toDateKey(r.endDate),
    halfDay: r.halfDay as "FIRST_HALF" | "SECOND_HALF" | null,
    days: r.days,
    reason: r.reason,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED",
    leaveType: r.leaveType?.name ?? null,
    decidedBy: r.decidedBy ? `${r.decidedBy.firstName} ${r.decidedBy.lastName}` : null,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    decisionNote: r.decisionNote,
    fixCheckIn: r.fixCheckIn ? formatTime(r.fixCheckIn, timeZone) : null,
    fixCheckOut: r.fixCheckOut ? formatTime(r.fixCheckOut, timeZone) : null,
    workMode: r.workMode as "OFFICE" | "WFH" | null,
    createdAt: r.createdAt.toISOString(),
    // Cancel: pending any time; approved only before it starts.
    canCancel: r.status === "PENDING" || (r.status === "APPROVED" && toDateKey(r.startDate) > today),
  };
}

export type RequestView = ReturnType<typeof presentRequest>;

export async function getMyLeave(employee: AuthEmployee) {
  if (!tracksAttendance(employee.role)) return null;
  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);
  const year = leaveYearOf(today);
  const [balances, requests] = await Promise.all([
    getBalances(employee.id, year),
    db.request.findMany({ where: { employeeId: employee.id, kind: "LEAVE" }, orderBy: { createdAt: "desc" }, take: 50, select: requestSelect }),
  ]);
  return { year, today, balances, requests: requests.map((r) => presentRequest(r as RequestRow, office.timezone, today)) };
}

/** WFH and attendance-fix requests, shown on My Attendance. */
export async function getMyAttendanceRequests(employee: AuthEmployee) {
  if (!tracksAttendance(employee.role)) return null;
  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);
  const requests = await db.request.findMany({
    where: { employeeId: employee.id, kind: { in: ["WFH", "ATTENDANCE_FIX"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: requestSelect,
  });
  return { today, requests: requests.map((r) => presentRequest(r as RequestRow, office.timezone, today)) };
}

// ─── Approvals ───

/** Everyone (leave:approve) or the teams the viewer leads. Null = can approve nobody. */
export async function getApproverScope(viewer: AuthEmployee) {
  const all = await hasPermission(viewer, "leave:approve");
  if (all) return { all: true as const, teamIds: [] as string[] };
  const teams = await db.team.findMany({ where: { leadId: viewer.id }, select: { id: true } });
  return teams.length ? { all: false as const, teamIds: teams.map((t) => t.id) } : null;
}

/** May `viewer` decide for `employeeId`? Never their own. */
export async function canDecideFor(viewer: AuthEmployee, employeeId: string) {
  if (viewer.id === employeeId) return false;
  const scope = await getApproverScope(viewer);
  if (!scope) return false;
  if (scope.all) return true;
  const theirTeams = await teamIdsOf(employeeId);
  return theirTeams.some((t) => scope.teamIds.includes(t));
}

export async function getInbox(viewer: AuthEmployee) {
  const scope = await getApproverScope(viewer);
  if (!scope) return null;
  const who = { id: { not: viewer.id }, ...(scope.all ? {} : inAnyTeam(scope.teamIds)) };
  const office = await getOfficeFor(viewer.id).catch(() => null);
  const timeZone = office?.timezone ?? "Asia/Kolkata";
  const today = todayKey(timeZone);

  const [requests, reviews, decided] = await Promise.all([
    db.request.findMany({
      where: { status: "PENDING", employee: who },
      orderBy: { createdAt: "asc" },
      select: { ...requestSelect, employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } } },
    }),
    db.attendance.findMany({
      where: { reviewStatus: "PENDING", employee: who },
      orderBy: { date: "asc" },
      select: {
        id: true, date: true, status: true, checkInAt: true, checkOutAt: true, workMinutes: true, isLate: true,
        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
      },
    }),
    db.request.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] }, employee: who },
      orderBy: { decidedAt: "desc" },
      take: 30,
      select: { ...requestSelect, employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } } },
    }),
  ]);

  const person = (e: { id: string; firstName: string; lastName: string; avatarUrl: string | null; designation: string | null }) =>
    ({ id: e.id, name: `${e.firstName} ${e.lastName}`, avatarUrl: e.avatarUrl, designation: e.designation });

  // For attendance fixes: what is recorded today for that day, to compare.
  const fixes = requests.filter((r) => r.kind === "ATTENDANCE_FIX");
  const recordedRows = fixes.length
    ? await db.attendance.findMany({
        where: { OR: fixes.map((r) => ({ employeeId: r.employee.id, date: r.startDate })) },
        select: { employeeId: true, date: true, status: true, checkInAt: true, checkOutAt: true, workMinutes: true, missedCheckout: true },
      })
    : [];
  const recordedFor = (employeeId: string, date: Date) => {
    const row = recordedRows.find((x) => x.employeeId === employeeId && x.date.getTime() === date.getTime());
    if (!row) return { status: null, checkIn: null, checkOut: null, workMinutes: null, missedCheckout: false };
    return {
      status: row.status as string,
      checkIn: row.checkInAt ? formatTime(row.checkInAt, timeZone) : null,
      checkOut: row.checkOutAt ? formatTime(row.checkOutAt, timeZone) : null,
      workMinutes: row.workMinutes,
      missedCheckout: row.missedCheckout || (!!row.checkInAt && !row.checkOutAt && toDateKey(row.date) < today),
    };
  };

  // For WFH requests: clock-ins already made under them (home days awaiting the decision).
  const wfh = requests.filter((r) => r.kind === "WFH");
  const homeRows = wfh.length
    ? await db.attendance.findMany({
        where: { OR: wfh.map((r) => ({ employeeId: r.employee.id, date: { gte: r.startDate, lte: r.endDate }, checkInAt: { not: null } })) },
        select: { employeeId: true, date: true, checkInAt: true, isLate: true, awaitingWfh: true },
        orderBy: { date: "asc" },
      })
    : [];
  const clockInsFor = (r: (typeof requests)[number]) =>
    r.kind !== "WFH" ? [] : homeRows
      .filter((x) => x.employeeId === r.employee.id && x.date >= r.startDate && x.date <= r.endDate)
      .map((x) => ({ date: toDateKey(x.date), checkIn: x.checkInAt ? formatTime(x.checkInAt, timeZone) : null, isLate: x.isLate, awaiting: x.awaitingWfh }));

  return {
    requests: requests.map((r) => ({
      ...presentRequest(r as RequestRow, timeZone, today),
      employee: person(r.employee),
      clockIns: clockInsFor(r),
      recorded: r.kind === "ATTENDANCE_FIX" ? recordedFor(r.employee.id, r.startDate) : null,
      fixMinutes: r.fixCheckIn && r.fixCheckOut ? Math.round((r.fixCheckOut.getTime() - r.fixCheckIn.getTime()) / 60_000) : null,
    })),
    reviews: reviews.map((a) => ({
      id: a.id,
      date: toDateKey(a.date),
      checkIn: a.checkInAt ? formatTime(a.checkInAt, timeZone) : null,
      checkOut: a.checkOutAt ? formatTime(a.checkOutAt, timeZone) : null,
      workMinutes: a.workMinutes,
      isLate: a.isLate,
      employee: person(a.employee),
    })),
    decided: decided.map((r) => ({ ...presentRequest(r as RequestRow, timeZone, today), employee: person(r.employee) })),
  };
}
