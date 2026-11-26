import { cache } from "react";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import type { AuthEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { tracksAttendance } from "@/lib/access";
import { eachDateKey, fromDateKey, toDateKey, todayKey } from "@/lib/attendance/calendar";
import { getOfficeFor } from "@/lib/attendance/queries";
import { getDefaultOffice } from "@/lib/attendance/settings";
import { getCoverage } from "@/lib/leave/queries";
import { inAnyTeam } from "@/lib/teams/membership";
import { taskKey } from "@/lib/tasks/keys";

// Daily updates: one per person per day they worked. Server-only helpers; the
// Server Actions in lib/actions/daily-update.actions.ts check who's asking.
// Queries that don't depend on each other run together, to keep round trips
// to the database few.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_MS = 86_400_000;

export const UPDATE_MAX_LENGTH = 4000;
export const UPDATE_MAX_TASKS = 20;
/** Days per page of the feed. */
export const FEED_PAGE_DAYS = 10;

export const taskSelect = {
  id: true, title: true, number: true, projectId: true, status: true,
  project: { select: { key: true, name: true } },
} as const;

type TaskRow = { id: string; title: string; number: number | null; projectId: string | null; status: string; project: { key: string | null; name: string } | null };

export function presentTask(t: TaskRow) {
  return { id: t.id, key: taskKey(t), title: t.title, status: t.status, project: t.project?.name ?? "General" };
}
export type UpdateTask = ReturnType<typeof presentTask>;

function shortDate(key: string) {
  return fromDateKey(key).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function addDays(key: string, delta: number) {
  return toDateKey(new Date(fromDateKey(key).getTime() + delta * DAY_MS));
}

/** Today in the person's office time zone. */
export async function todayFor(employeeId: string) {
  return todayKey((await getOfficeFor(employeeId)).timezone);
}

/**
 * Can this person add or edit their update for a day? Only for a day they
 * worked: they clocked in and the day isn't marked Absent. Today or earlier.
 */
export async function canPostOn(employee: Pick<AuthEmployee, "id" | "role">, dateKey: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!tracksAttendance(employee.role)) return { ok: false, reason: "Super Admins don't track attendance, so they don't add daily updates." };
  if (!DATE_KEY.test(dateKey)) return { ok: false, reason: "Pick a valid date." };

  const [today, row, coverageMap] = await Promise.all([
    todayFor(employee.id),
    db.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } },
      select: { checkInAt: true, status: true },
    }),
    getCoverage([employee.id], dateKey, dateKey),
  ]);
  if (dateKey > today) return { ok: false, reason: "You can't add an update for a day that hasn't happened yet." };
  if (row?.checkInAt && row.status !== "ABSENT") return { ok: true };

  const isToday = dateKey === today;
  const coverage = coverageMap.get(employee.id)?.get(dateKey);
  if (coverage?.kind === "LEAVE" && !coverage.halfDay) {
    return { ok: false, reason: isToday ? "You're on leave today, so there's no update to add." : `You were on leave on ${shortDate(dateKey)}, so there's no update to add.` };
  }
  if (row?.checkInAt) return { ok: false, reason: `${isToday ? "Today" : shortDate(dateKey)} is marked Absent, so the update can't be changed. Ask an admin to fix the attendance first.` };
  return {
    ok: false,
    reason: isToday
      ? "You haven't registered your attendance today, so you can't add an update. Clock in first."
      : `You didn't register attendance on ${shortDate(dateKey)}, so you can't add an update for it.`,
  };
}

/**
 * Everything the update form needs for one day (today by default). Sessions
 * never cross midnight (they close as a missed checkout), so today is the day
 * being worked.
 */
export async function getUpdateForm(employee: Pick<AuthEmployee, "id" | "role">, dateKey?: string | null) {
  const today = await todayFor(employee.id);
  const date = dateKey && DATE_KEY.test(dateKey) && dateKey <= today ? dateKey : today;
  // Tasks to link: assigned to them and still open, or closed in the last two
  // weeks; plus anything already linked.
  const since = new Date(fromDateKey(date).getTime() - 14 * DAY_MS);

  const [eligible, update, options] = await Promise.all([
    canPostOn(employee, date),
    db.dailyUpdate.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(date) } },
      select: { body: true, updatedAt: true, tasks: { select: taskSelect } },
    }),
    db.task.findMany({
      where: {
        assignees: { some: { id: employee.id } },
        OR: [{ status: { notIn: ["DONE", "CANCELLED"] } }, { updatedAt: { gte: since } }],
      },
      select: taskSelect,
      orderBy: [{ updatedAt: "desc" }],
      take: 150,
    }),
  ]);
  const linked = update?.tasks ?? [];
  const optionIds = new Set(options.map((t) => t.id));

  return {
    dateKey: date,
    today,
    eligible,
    update: update ? { body: update.body, updatedAt: update.updatedAt.toISOString(), taskIds: linked.map((t) => t.id) } : null,
    taskOptions: [...linked.filter((t) => !optionIds.has(t.id)), ...options].map(presentTask),
  };
}
export type UpdateFormData = Awaited<ReturnType<typeof getUpdateForm>>;

// ─── Viewing other people's updates ───

/**
 * Whose updates the viewer can see besides their own: everyone (update:view-all,
 * and Admins), or the teams they lead. Null when only their own. Cached per
 * request, so the page and its parts share one lookup.
 */
export const getUpdateScope = cache(async (viewer: AuthEmployee) => {
  const [all, led] = await Promise.all([
    hasPermission(viewer, "update:view-all"),
    db.team.findMany({ where: { leadId: viewer.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (all) {
    const teams = await db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    return { all: true as const, teams, label: "Everyone" };
  }
  return led.length ? { all: false as const, teams: led, label: led.map((t) => t.name).join(", ") } : null;
});
type Scope = NonNullable<Awaited<ReturnType<typeof getUpdateScope>>>;

function scopeFilter(scope: Scope, teamId?: string | null) {
  if (teamId && scope.teams.some((t) => t.id === teamId)) return inAnyTeam([teamId]);
  return scope.all ? {} : inAnyTeam(scope.teams.map((t) => t.id));
}

/** Can the viewer see this person's updates? */
export async function canSeeUpdatesOf(viewer: AuthEmployee, personId: string) {
  if (personId === viewer.id) return true;
  const scope = await getUpdateScope(viewer);
  if (!scope) return false;
  if (scope.all) return true;
  return (await db.employee.count({ where: { id: personId, ...scopeFilter(scope) } })) > 0;
}

const personSelect = {
  id: true, firstName: true, lastName: true, avatarUrl: true, designation: true,
  teamMemberships: { select: { team: { select: { name: true } } }, orderBy: { joinedAt: "asc" as const } },
} as const;

function presentPerson(p: { id: string; firstName: string; lastName: string; avatarUrl: string | null; designation: string | null; teamMemberships: { team: { name: string } }[] }) {
  return { id: p.id, name: `${p.firstName} ${p.lastName}`, avatarUrl: p.avatarUrl, designation: p.designation, team: p.teamMemberships.map((m) => m.team.name).join(", ") || null };
}
export type UpdatePerson = ReturnType<typeof presentPerson>;

/** Projects for the feed's filter. */
export async function getFeedProjects() {
  return db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/**
 * The feed: a page of days, newest first, from `start` (today by default) back
 * FEED_PAGE_DAYS days. Each day has the updates, and (without a project
 * filter) who worked but hasn't added one. Days nobody worked are left out,
 * except today. One round of queries for the whole page.
 */
export async function getUpdatesFeed(viewer: AuthEmployee, input: { start?: string | null; teamId?: string | null; projectId?: string | null }) {
  const [scope, office] = await Promise.all([getUpdateScope(viewer), getDefaultOffice()]);
  if (!scope) return null;
  const today = todayKey(office.timezone);
  const end = input.start && DATE_KEY.test(input.start) && input.start <= today ? input.start : today;
  const from = addDays(end, -(FEED_PAGE_DAYS - 1));
  const teamId = input.teamId && scope.teams.some((t) => t.id === input.teamId) ? input.teamId : null;
  const projectId = input.projectId || null;

  const inScope = { role: { not: "SUPER_ADMIN" as const }, ...scopeFilter(scope, teamId) };
  const range = { gte: fromDateKey(from), lte: fromDateKey(end) };

  const [people, worked, updates, earlier] = await Promise.all([
    db.employee.findMany({
      where: { ...inScope, OR: [{ status: "ACTIVE" }, { exitDate: { gte: fromDateKey(from) } }, { dailyUpdates: { some: { date: range } } }] },
      orderBy: { firstName: "asc" },
      select: personSelect,
    }),
    projectId
      ? Promise.resolve([])
      : db.attendance.findMany({ where: { date: range, checkInAt: { not: null }, status: { not: "ABSENT" }, employee: inScope }, select: { employeeId: true, date: true } }),
    db.dailyUpdate.findMany({
      where: { date: range, employee: inScope, ...(projectId ? { tasks: { some: { projectId } } } : {}) },
      select: { id: true, employeeId: true, date: true, body: true, updatedAt: true, tasks: { select: taskSelect } },
    }),
    // Anything older, so the feed knows whether to offer Load More.
    (projectId
      ? db.dailyUpdate.findFirst({ where: { date: { lt: fromDateKey(from) }, employee: inScope, tasks: { some: { projectId } } }, select: { id: true } })
      : db.attendance.findFirst({ where: { date: { lt: fromDateKey(from) }, checkInAt: { not: null }, employee: inScope }, select: { id: true } })),
  ]);

  const byId = new Map(people.map((p) => [p.id, presentPerson(p)]));
  const order = new Map(people.map((p, i) => [p.id, i]));
  const workedByDay = new Map<string, Set<string>>();
  for (const w of worked) {
    const k = toDateKey(w.date);
    if (!workedByDay.has(k)) workedByDay.set(k, new Set());
    workedByDay.get(k)!.add(w.employeeId);
  }
  const updatesByDay = new Map<string, typeof updates>();
  for (const u of updates) {
    const k = toDateKey(u.date);
    if (!updatesByDay.has(k)) updatesByDay.set(k, []);
    updatesByDay.get(k)!.push(u);
  }

  const days = eachDateKey(from, end).reverse().flatMap((dateKey) => {
    const dayUpdates = (updatesByDay.get(dateKey) ?? [])
      .filter((u) => byId.has(u.employeeId))
      .sort((a, b) => (order.get(a.employeeId) ?? 0) - (order.get(b.employeeId) ?? 0));
    const workers = workedByDay.get(dateKey) ?? new Set<string>();
    const posted = new Set(dayUpdates.map((u) => u.employeeId));
    const missing = [...workers].filter((id) => !posted.has(id) && byId.has(id)).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    if (dayUpdates.length === 0 && missing.length === 0 && dateKey !== today) return [];
    return [{
      dateKey,
      updates: dayUpdates.map((u) => ({ id: u.id, person: byId.get(u.employeeId)!, body: u.body, updatedAt: u.updatedAt.toISOString(), tasks: u.tasks.map(presentTask) })),
      missing: missing.map((id) => byId.get(id)!),
      workedCount: workers.size,
      addedCount: dayUpdates.filter((u) => workers.has(u.employeeId)).length,
    }];
  });

  return {
    today,
    start: end,
    days,
    /** Where the next page starts, or null when there's nothing older. */
    nextStart: earlier ? addDays(from, -1) : null,
    scope: { label: scope.label, all: scope.all, teams: scope.teams },
    teamId,
    projectId,
  };
}
export type UpdatesFeed = NonNullable<Awaited<ReturnType<typeof getUpdatesFeed>>>;
export type FeedDay = UpdatesFeed["days"][number];

/** One person's updates in a month, newest first, with a count of days worked. */
export async function getPersonUpdates(viewer: AuthEmployee, personId: string, monthKey?: string | null) {
  const [allowed, person, today] = await Promise.all([
    canSeeUpdatesOf(viewer, personId),
    db.employee.findUnique({ where: { id: personId }, select: personSelect }),
    todayFor(personId),
  ]);
  if (!allowed) throw new UserError("You can't see this person's updates.");
  if (!person) throw new UserError("Person not found.");
  const currentMonth = today.slice(0, 7);
  const month = monthKey && MONTH_KEY.test(monthKey) && monthKey <= currentMonth ? monthKey : currentMonth;
  const [y, m] = month.split("-").map(Number);
  const from = fromDateKey(`${month}-01`);
  const to = new Date(Date.UTC(y, m, 0));

  const [updates, workedDays] = await Promise.all([
    db.dailyUpdate.findMany({
      where: { employeeId: personId, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
      select: { id: true, date: true, body: true, updatedAt: true, tasks: { select: taskSelect } },
    }),
    db.attendance.count({ where: { employeeId: personId, date: { gte: from, lte: to }, checkInAt: { not: null }, status: { not: "ABSENT" } } }),
  ]);

  return {
    person: presentPerson(person),
    month,
    currentMonth,
    today,
    workedDays,
    updates: updates.map((u) => ({ id: u.id, dateKey: toDateKey(u.date), body: u.body, updatedAt: u.updatedAt.toISOString(), tasks: u.tasks.map(presentTask) })),
  };
}
