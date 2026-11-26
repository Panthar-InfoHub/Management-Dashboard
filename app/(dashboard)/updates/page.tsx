import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentEmployee, type AuthEmployee } from "@/lib/auth";
import { getFeedProjects, getPersonUpdates, getUpdateForm, getUpdateScope, getUpdatesFeed } from "@/lib/updates/queries";
import { UpdatesFeed } from "@/components/updates/updates-feed";
import { MyUpdates } from "@/components/updates/my-updates";
import { PersonHeader, UpdateCard, formatUpdateDay, historyStat } from "@/components/updates/update-card";
import { MonthNav, monthTitle } from "@/components/attendance/month-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkPending } from "@/components/ui/link-pending";
import { ParamsSuspense } from "@/components/ui/params-suspense";
import { cn } from "@/lib/utils";

type Params = { view?: string; date?: string; team?: string; project?: string; person?: string; month?: string };

export default function DailyUpdatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">What each person worked on, one update per day worked.</p>
      </div>
      <ParamsSuspense fallback={<UpdatesSkeleton />}>
        <UpdatesBody searchParams={searchParams} />
      </ParamsSuspense>
    </div>
  );
}

function UpdatesSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

async function UpdatesBody({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const [viewer, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  const scope = await getUpdateScope(viewer);
  const view = params.person && params.person !== viewer.id ? "person" : scope && params.view !== "mine" ? "feed" : "mine";

  return (
    <div className="max-w-3xl space-y-6">
      {scope && (
        <nav aria-label="Daily updates views" className="inline-flex rounded-lg border border-border p-0.5">
          {([["feed", "Feed", "/updates"], ["mine", "My Updates", "/updates?view=mine"]] as const).map(([id, label, href]) => {
            const active = id === "feed" ? view !== "mine" : view === "mine";
            return (
              <Link key={id} href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors", active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {label}
                <LinkPending className="size-2.5" />
              </Link>
            );
          })}
        </nav>
      )}
      {view === "feed" && <FeedView viewer={viewer} params={params} />}
      {view === "mine" && <MineView viewer={viewer} params={params} />}
      {view === "person" && <PersonHistory viewer={viewer} personId={params.person!} month={params.month} />}
    </div>
  );
}

async function FeedView({ viewer, params }: { viewer: AuthEmployee; params: Params }) {
  const [feed, projects] = await Promise.all([
    getUpdatesFeed(viewer, { start: params.date, teamId: params.team, projectId: params.project }),
    getFeedProjects(),
  ]);
  if (!feed) return null;
  // A new start date or filter starts a fresh feed.
  return <UpdatesFeed key={`${feed.start}|${feed.teamId}|${feed.projectId}`} feed={feed} projects={projects} viewerId={viewer.id} />;
}

async function MineView({ viewer, params }: { viewer: AuthEmployee; params: Params }) {
  const [form, history] = await Promise.all([getUpdateForm(viewer, params.date), getPersonUpdates(viewer, viewer.id, params.month)]);
  return <MyUpdates key={form.dateKey} form={form} history={history} />;
}

async function PersonHistory({ viewer, personId, month }: { viewer: AuthEmployee; personId: string; month?: string }) {
  const history = await getPersonUpdates(viewer, personId, month);
  const href = (m: string | null) => `/updates?person=${personId}${m ? `&month=${m}` : ""}`;

  return (
    <div className="space-y-5">
      <Link href="/updates" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Feed
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <PersonHeader person={history.person} />
          <p className="text-xs text-muted-foreground tabular-nums">{historyStat(history.updates.length, history.workedDays, history.month)}</p>
        </div>
        <MonthNav monthKey={history.month} currentMonth={history.currentMonth} href={href} />
      </div>
      {history.updates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No updates in {monthTitle(history.month)}.</p>
      ) : (
        <div className="space-y-3">
          {history.updates.map((u) => (
            <UpdateCard key={u.id} header={<h3 className="text-sm font-medium">{formatUpdateDay(u.dateKey)}</h3>} body={u.body} tasks={u.tasks} updatedAt={u.updatedAt} />
          ))}
        </div>
      )}
    </div>
  );
}
