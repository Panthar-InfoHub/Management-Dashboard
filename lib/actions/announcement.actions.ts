"use server";
import { UserError } from "@/lib/errors";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromDateKey, todayKey } from "@/lib/attendance/calendar";
import { emailAnnouncement } from "@/lib/email/notify";

type Input = { title: string; body: string; teamIds: string[]; pinned: boolean; expiresOn?: string | null };

async function clean(input: Input) {
  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  if (!title) throw new UserError("Add a title.");
  if (title.length > 120) throw new UserError("Keep the title under 120 characters.");
  if (!body) throw new UserError("Write the announcement.");
  if (body.length > 4000) throw new UserError("Keep it under 4000 characters.");
  const teamIds = [...new Set(input.teamIds ?? [])];
  if (teamIds.length && (await db.team.count({ where: { id: { in: teamIds } } })) !== teamIds.length) {
    throw new UserError("One of those teams no longer exists. Reload and pick again.");
  }
  let expiresAt: Date | null = null;
  if (input.expiresOn) {
    if (input.expiresOn < todayKey("Asia/Kolkata")) throw new UserError("The end date has already passed.");
    // Visible through the end of that day (IST).
    expiresAt = new Date(fromDateKey(input.expiresOn).getTime() + (24 * 60 - 330) * 60_000);
  }
  return { title, body, teamIds, pinned: !!input.pinned, expiresAt };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/announcements");
}

export async function createAnnouncementAction(input: Input) {
  const author = await requireAuth("announcement:manage");
  const data = await clean(input);
  const post = await db.announcement.create({ data: { ...data, authorId: author.id } });

  // Tell the audience.
  const audience = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      id: { not: author.id },
      ...(data.teamIds.length ? { teamMemberships: { some: { teamId: { in: data.teamIds } } } } : {}),
    },
    select: { id: true },
  });
  if (audience.length) {
    await db.notification.createMany({
      data: audience.map((p) => ({
        recipientId: p.id,
        type: "ANNOUNCEMENT",
        title: "New announcement",
        message: data.title,
        actionUrl: "/announcements",
      })),
    });
    emailAnnouncement(post.id, audience.map((p) => p.id));
  }

  audit({ actorId: author.id, entity: "Announcement", entityId: post.id, action: "create", changes: { title: data.title, teamIds: data.teamIds, notified: audience.length } });
  refresh();
  return { success: true, notified: audience.length };
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
