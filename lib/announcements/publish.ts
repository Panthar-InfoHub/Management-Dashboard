import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fromDateKey, todayKey } from "@/lib/attendance/calendar";
import { emailAnnouncement } from "@/lib/email/notify";

// Internal helpers — NOT Server Actions. Callers check announcement:manage first.

export type AnnouncementInput = { title: string; body: string; teamIds: string[]; pinned: boolean; expiresOn?: string | null };

export async function cleanAnnouncement(input: AnnouncementInput) {
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

export function refreshAnnouncements() {
  revalidatePath("/");
  revalidatePath("/announcements");
}

/** Post an announcement, then notify its audience in-app and by email. */
export async function publishAnnouncement(authorId: string, data: Awaited<ReturnType<typeof cleanAnnouncement>>) {
  const post = await db.announcement.create({ data: { ...data, authorId } });

  const audience = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      id: { not: authorId },
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

  audit({ actorId: authorId, entity: "Announcement", entityId: post.id, action: "create", changes: { title: data.title, teamIds: data.teamIds, notified: audience.length } });
  refreshAnnouncements();
  return { id: post.id, notified: audience.length };
}
