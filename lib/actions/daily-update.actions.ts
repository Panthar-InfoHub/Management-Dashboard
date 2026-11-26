"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { getCurrentEmployee } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromDateKey } from "@/lib/attendance/calendar";
import { getUpdateForm, getUpdatesFeed } from "@/lib/updates/queries";
import { saveDailyUpdate } from "@/lib/updates/save";

/** The form for one day of your own (today by default). */
export async function getMyUpdateFormAction(dateKey?: string | null) {
  const employee = await getCurrentEmployee();
  return getUpdateForm(employee, dateKey);
}

/** The next page of the feed (older days), for Load More. Same scope as the page. */
export async function loadUpdatesFeedAction(input: { start: string; teamId?: string | null; projectId?: string | null }) {
  const viewer = await getCurrentEmployee();
  const feed = await getUpdatesFeed(viewer, input);
  if (!feed) throw new UserError("You can only see your own updates.");
  return { days: feed.days, nextStart: feed.nextStart };
}

/** Add or replace your update for a day you worked. Linked tasks must be assigned to you. */
export async function saveDailyUpdateAction(input: { date: string; body: string; taskIds: string[] }) {
  const employee = await getCurrentEmployee();
  const saved = await saveDailyUpdate({ employee, dateKey: input.date, body: input.body, taskIds: input.taskIds ?? [], source: "app" });
  return { success: true, created: saved.created };
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
