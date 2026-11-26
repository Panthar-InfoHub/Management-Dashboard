// Announcements visible to a person: company-wide ones, plus ones for any team
// they're in. Expired ones are hidden (managers still see them on the page).
import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import { teamIdsOf } from "@/lib/teams/membership";

const select = {
  id: true, title: true, body: true, teamIds: true, pinned: true, expiresAt: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

export async function getAnnouncements(viewer: AuthEmployee, opts: { limit?: number; includeExpired?: boolean } = {}) {
  const teamIds = await teamIdsOf(viewer.id);
  const now = new Date();
  const rows = await db.announcement.findMany({
    where: {
      ...(opts.includeExpired ? {} : { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }),
      // Company-wide posts, plus posts for any team they're in.
      AND: opts.includeExpired ? [] : [{ OR: [{ teamIds: { isEmpty: true } }, ...(teamIds.length ? [{ teamIds: { hasSome: teamIds } }] : [])] }],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: opts.limit ?? 50,
    select,
  });
  const teamNames = new Map(
    (await db.team.findMany({ where: { id: { in: [...new Set(rows.flatMap((r) => r.teamIds))] } }, select: { id: true, name: true } })).map((t) => [t.id, t.name])
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    teamIds: r.teamIds,
    audience: r.teamIds.length ? r.teamIds.map((id) => teamNames.get(id) ?? "a removed team").join(", ") : "Everyone",
    expiresAt: r.expiresAt?.toISOString().slice(0, 10) ?? null,
    expired: !!r.expiresAt && r.expiresAt <= now,
    createdAt: r.createdAt.toISOString(),
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
    author: { id: r.author.id, name: `${r.author.firstName} ${r.author.lastName}`, avatarUrl: r.author.avatarUrl },
  }));
}

export type AnnouncementView = Awaited<ReturnType<typeof getAnnouncements>>[number];
