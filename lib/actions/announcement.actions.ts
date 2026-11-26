"use server";
import { UserError } from "@/lib/errors";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { cleanAnnouncement as clean, publishAnnouncement, refreshAnnouncements as refresh, type AnnouncementInput as Input } from "@/lib/announcements/publish";

export async function createAnnouncementAction(input: Input) {
  const author = await requireAuth("announcement:manage");
  const { notified } = await publishAnnouncement(author.id, await clean(input));
  return { success: true, notified };
}

export async function updateAnnouncementAction(id: string, input: Input) {
  const actor = await requireAuth("announcement:manage");
  const before = await db.announcement.findUnique({ where: { id } });
  if (!before) throw new UserError("That announcement was deleted.");
  const data = await clean(input);
  await db.announcement.update({ where: { id }, data });
  audit({ actorId: actor.id, entity: "Announcement", entityId: id, action: "update", changes: { title: [before.title, data.title] } });
  refresh();
  return { success: true };
}

export async function deleteAnnouncementAction(id: string) {
  const actor = await requireAuth("announcement:manage");
  const before = await db.announcement.findUnique({ where: { id }, select: { title: true } });
  if (!before) throw new UserError("That announcement was already deleted.");
  await db.announcement.delete({ where: { id } });
  audit({ actorId: actor.id, entity: "Announcement", entityId: id, action: "delete", changes: { title: before.title } });
  refresh();
  return { success: true };
}
