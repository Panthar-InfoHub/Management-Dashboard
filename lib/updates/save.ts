import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import type { AuthEmployee } from "@/lib/auth";
import { fromDateKey } from "@/lib/attendance/calendar";
import { UPDATE_MAX_LENGTH, UPDATE_MAX_TASKS, canPostOn } from "@/lib/updates/queries";

// Internal helper — NOT a Server Action. Used by saveDailyUpdateAction (the
// signed-in person) and POST /api/updates (API key, for the person named).

/**
 * Create or overwrite a person's update for a day they worked.
 * `taskIds` replaces the linked tasks; leave it undefined to keep the current
 * links. Linked tasks must be assigned to the person (ones already linked stay
 * allowed). Throws UserError with a message safe to show.
 */
export async function saveDailyUpdate(input: {
  employee: Pick<AuthEmployee, "id" | "role">;
  dateKey: string;
  body: unknown;
  taskIds?: unknown;
  source: "app" | "api";
}) {
  const { employee, dateKey } = input;
  const eligible = await canPostOn(employee, dateKey);
  if (!eligible.ok) throw new UserError(eligible.reason);

  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body) throw new UserError("Write what you worked on.");
  if (body.length > UPDATE_MAX_LENGTH) throw new UserError(`Keep the update under ${UPDATE_MAX_LENGTH} characters.`);

  let taskIds: string[] | undefined;
  if (input.taskIds !== undefined && input.taskIds !== null) {
    if (!Array.isArray(input.taskIds) || input.taskIds.some((id) => typeof id !== "string")) throw new UserError("taskIds must be a list of task IDs.");
    taskIds = [...new Set((input.taskIds as string[]).map((id) => id.trim()).filter(Boolean))];
    if (taskIds.length > UPDATE_MAX_TASKS) throw new UserError(`Link at most ${UPDATE_MAX_TASKS} tasks.`);
  }

  const date = fromDateKey(dateKey);
  const existing = await db.dailyUpdate.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
    select: { id: true, tasks: { select: { id: true } } },
  });
  if (taskIds?.length) {
    const alreadyLinked = new Set(existing?.tasks.map((t) => t.id) ?? []);
    const toCheck = taskIds.filter((id) => !alreadyLinked.has(id));
    if (toCheck.length) {
      const mine = await db.task.count({ where: { id: { in: toCheck }, assignees: { some: { id: employee.id } } } });
      if (mine !== toCheck.length) throw new UserError("Only tasks assigned to this person can be linked.");
    }
  }

  const links = taskIds?.map((id) => ({ id }));
  const saved = await db.dailyUpdate.upsert({
    where: { employeeId_date: { employeeId: employee.id, date } },
    create: { employeeId: employee.id, date, body, ...(links ? { tasks: { connect: links } } : {}) },
    update: { body, ...(links ? { tasks: { set: links } } : {}) },
    select: { id: true, updatedAt: true, tasks: { select: { id: true } } },
  });

  audit({
    actorId: employee.id, entity: "DailyUpdate", entityId: saved.id, action: existing ? "update" : "create",
    changes: { date: dateKey, tasks: saved.tasks.length, source: input.source },
  });
  // Attendance pages show whether each worked day has an update.
  for (const path of ["/updates", "/attendance", "/attendance/today", "/attendance/team"]) revalidatePath(path);
  return { id: saved.id, created: !existing, updatedAt: saved.updatedAt, taskIds: saved.tasks.map((t) => t.id) };
}
