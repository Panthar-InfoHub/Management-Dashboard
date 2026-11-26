import { Suspense } from "react";
import { Megaphone, Plus } from "lucide-react";
import { getCurrentEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getAnnouncements } from "@/lib/queries/announcement.queries";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { AnnouncementActions } from "@/components/announcements/announcement-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <Suspense fallback={<><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-xl" /></>}>
        <AnnouncementsBody />
      </Suspense>
    </div>
  );
}

async function AnnouncementsBody() {
  const me = await getCurrentEmployee();
  const canManage = await hasPermission(me, "announcement:manage");
  const [posts, teams] = await Promise.all([
    getAnnouncements(me, { includeExpired: canManage, limit: 100 }),
    canManage ? db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">News for the company or your teams.</p>
        </div>
        {canManage && <AnnouncementDialog teams={teams} trigger={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Announcement</Button>} />}
      </div>
      {posts.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description={canManage ? "Post the first one with New Announcement." : "News from the company will show here."} />
      ) : (
        <div className="space-y-4">
          {posts.map((a) => <AnnouncementCard key={a.id} a={a} actions={canManage ? <AnnouncementActions a={a} teams={teams} /> : undefined} />)}
        </div>
      )}
    </>
  );
}
