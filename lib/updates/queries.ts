import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import type { AuthEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { tracksAttendance } from "@/lib/access";
import { fromDateKey, toDateKey, todayKey } from "@/lib/attendance/calendar";
import { getOfficeFor } from "@/lib/attendance/queries";
import { getDefaultOffice } from "@/lib/attendance/settings";
import { getCoverage } from "@/lib/leave/queries";
import { inAnyTeam } from "@/lib/teams/membership";
import { taskKey } from "@/lib/tasks/keys";

// Daily updates: one per person per day they worked. Server-only helpers; the
// Server Actions in lib/actions/daily-update.actions.ts check who's asking.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export const UPDATE_MAX_LENGTH = 4000;
export const UPDATE_MAX_TASKS = 20;

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
  const today = await todayFor(employee.id);
  if (dateKey > today) return { ok: false, reason: "You can't add an update for a day that hasn't happened yet." };

  const row = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } },
    select: { checkInAt: true, status: true },
  });
  if (row?.checkInAt && row.status !== "ABSENT") return { ok: true };

  const isToday = dateKey === today;
  const coverage = (await getCoverage([employee.id], dateKey, dateKey)).get(employee.id)?.get(dateKey);
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
  const [eligible, update] = await Promise.all([
    canPostOn(employee, date),
    db.dailyUpdate.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(date) } },
      select: { body: true, updatedAt: true, tasks: { select: taskSelect } },
    }),
  ]);

  // Tasks to link: assigned to them and still open, or closed in the last two
  // weeks; plus anything already linked.
  const since = new Date(fromDateKey(date).getTime() - 14 * 86_400_000);
  const options = await db.task.findMany({
    where: {
      assignees: { some: { id: employee.id } },
      OR: [{ status: { notIn: ["DONE", "CANCELLED"] } }, { updatedAt: { gte: since } }],
    },
    select: taskSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 150,
  });
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
 * and Admins), or the teams they lead. Null when only their own.
 */
export async function getUpdateScope(viewer: AuthEmployee) {
  if (await hasPermission(viewer, "update:view-all")) {
    const teams = await db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    return { all: true as const, teams, label: "Everyone" };
  }
  const teams = await db.team.findMany({ where: { leadId: viewer.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return teams.length ? { all: false as const, teams, label: teams.map((t) => t.name).join(", ") } : null;
}
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

/**
 * One day for everyone in scope: who worked (clocked in) and their update, or
 * that they haven't added one. With a project, only updates linking its tasks.
 */
export async function getUpdatesDay(viewer: AuthEmployee, input: { date?: string; teamId?: string | null; projectId?: string | null }) {
  const scope = await getUpdateScope(viewer);
  if (!scope) return null;
  const today = todayKey((await getDefaultOffice()).timezone);
  const dateKey = input.date && DATE_KEY.test(input.date) && input.date <= today ? input.date : today;
  const date = fromDateKey(dateKey);
  const teamId = input.teamId && scope.teams.some((t) => t.id === input.teamId) ? input.teamId : null;
  const projectId = input.projectId || null;

  const people = await db.employee.findMany({
    where: {
      role: { not: "SUPER_ADMIN" },
      OR: [{ status: "ACTIVE" }, { exitDate: { gte: date } }],
      ...scopeFilter(scope, teamId),
    },
    orderBy: { firstName: "asc" },
    select: personSelect,
  });
  const ids = people.map((p) => p.id);

  const [worked, updates, projects] = await Promise.all([
    db.attendance.findMany({ where: { employeeId: { in: ids }, date, checkInAt: { not: null }, status: { not: "ABSENT" } }, select: { employeeId: true } }),
    db.dailyUpdate.findMany({
      where: { employeeId: { in: ids }, date, ...(projectId ? { tasks: { some: { projectId } } } : {}) },
      select: { id: true, employeeId: true, body: true, updatedAt: true, tasks: { select: taskSelect } },
    }),
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const workedIds = new Set(worked.map((w) => w.employeeId));
  const byPerson = new Map(updates.map((u) => [u.employeeId, u]));

  const rows = people
    .filter((p) => byPerson.has(p.id) || (!projectId && workedIds.has(p.id)))
    .map((p) => {
      const u = byPerson.get(p.id);
      return {
        person: presentPerson(p),
        update: u ? { id: u.id, body: u.body, updatedAt: u.updatedAt.toISOString(), tasks: u.tasks.map(presentTask) } : null,
      };
    });

  return {
    dateKey,
    today,
    scope,
    teamId,
    projectId,
    projects,
    rows: [...rows.filter((r) => r.update), ...rows.filter((r) => !r.update)],
    /** People who worked that day, and how many of them added an update. */
    workedCount: workedIds.size,
    addedCount: updates.filter((u) => workedIds.has(u.employeeId)).length,
  };
}

/** One person's updates in a month, newest first, with a count of days worked. */
export async function getPersonUpdates(viewer: AuthEmployee, personId: string, monthKey?: string | null) {
  if (!(await canSeeUpdatesOf(viewer, personId))) throw new UserError("You can't see this person's updates.");
  const person = await db.employee.findUnique({ where: { id: personId }, select: personSelect });
  if (!person) throw new UserError("Person not found.");
  const today = await todayFor(personId);
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
