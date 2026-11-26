"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { getCurrentEmployee } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromDateKey } from "@/lib/attendance/calendar";
import { UPDATE_MAX_LENGTH, UPDATE_MAX_TASKS, canPostOn, getUpdateForm } from "@/lib/updates/queries";

/** The form for one day of your own (today by default). */
export async function getMyUpdateFormAction(dateKey?: string | null) {
  const employee = await getCurrentEmployee();
  return getUpdateForm(employee, dateKey);
}

/** Add or replace your update for a day you worked. Linked tasks must be assigned to you. */
export async function saveDailyUpdateAction(input: { date: string; body: string; taskIds: string[] }) {
  const employee = await getCurrentEmployee();
  const eligible = await canPostOn(employee, input.date);
  if (!eligible.ok) throw new UserError(eligible.reason);

  const body = input.body?.trim() ?? "";
  if (!body) throw new UserError("Write what you worked on.");
  if (body.length > UPDATE_MAX_LENGTH) throw new UserError(`Keep the update under ${UPDATE_MAX_LENGTH} characters.`);
  const taskIds = [...new Set((input.taskIds ?? []).filter(Boolean))];
  if (taskIds.length > UPDATE_MAX_TASKS) throw new UserError(`Link at most ${UPDATE_MAX_TASKS} tasks.`);

  const date = fromDateKey(input.date);
  const existing = await db.dailyUpdate.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
    select: { id: true, tasks: { select: { id: true } } },
  });
  if (taskIds.length) {
    // Your own tasks only; a task already linked stays allowed if you were unassigned since.
    const alreadyLinked = new Set(existing?.tasks.map((t) => t.id) ?? []);
    const mine = await db.task.count({ where: { id: { in: taskIds.filter((id) => !alreadyLinked.has(id)) }, assignees: { some: { id: employee.id } } } });
    if (mine !== taskIds.filter((id) => !alreadyLinked.has(id)).length) {
      throw new UserError("You can only link tasks assigned to you. Reload and pick again.");
    }
  }

  const tasks = taskIds.map((id) => ({ id }));
  const saved = await db.dailyUpdate.upsert({
    where: { employeeId_date: { employeeId: employee.id, date } },
    create: { employeeId: employee.id, date, body, tasks: { connect: tasks } },
    update: { body, tasks: { set: tasks } },
    select: { id: true },
  });

  audit({ actorId: employee.id, entity: "DailyUpdate", entityId: saved.id, action: existing ? "update" : "create", changes: { date: input.date, tasks: taskIds.length } });
  revalidatePath("/updates");
  return { success: true, created: !existing };
}

/** Delete your own update for a day. */
export async function deleteDailyUpdateAction(dateKey: string) {
  const employee = await getCurrentEmployee();
  const existing = await db.dailyUpdate.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } },
    select: { id: true },
  });
  if (!existing) throw new UserError("That update was already deleted.");
  await db.dailyUpdate.delete({ where: { id: existing.id } });
  audit({ actorId: employee.id, entity: "DailyUpdate", entityId: existing.id, action: "delete", changes: { date: dateKey } });
  revalidatePath("/updates");
  return { success: true };
}
