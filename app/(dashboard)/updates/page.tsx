import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentEmployee, type AuthEmployee } from "@/lib/auth";
import { getPersonUpdates, getUpdateForm, getUpdateScope, getUpdatesDay } from "@/lib/updates/queries";
import { UpdateForm } from "@/components/updates/update-form";
import { PersonHeader, UpdateCard, formatUpdateDay } from "@/components/updates/update-card";
import { MonthNav, monthTitle } from "@/components/attendance/month-nav";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSelect } from "@/components/ui/form-select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type Params = { view?: string; date?: string; team?: string; project?: string; person?: string; month?: string };

export default function DailyUpdatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">What each person worked on, one update per day worked.</p>
      </div>
      <Suspense fallback={<UpdatesSkeleton />}>
        <UpdatesBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function UpdatesSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

async function UpdatesBody({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const [viewer, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  const scope = await getUpdateScope(viewer);
  const view = params.person && params.person !== viewer.id ? "person" : scope && params.view !== "mine" ? "team" : "mine";

  return (
    <div className="max-w-3xl space-y-6">
      {scope && (
        <nav aria-label="Daily updates views" className="inline-flex rounded-lg border border-border p-0.5">
          {([["team", "Team", "/updates"], ["mine", "My Updates", "/updates?view=mine"]] as const).map(([id, label, href]) => {
            const active = id === "team" ? view !== "mine" : view === "mine";
            return (
              <Link key={id} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      {view === "team" && <TeamDay viewer={viewer} params={params} />}
      {view === "mine" && <MyUpdates viewer={viewer} params={params} />}
      {view === "person" && <PersonHistory viewer={viewer} personId={params.person!} month={params.month} />}
    </div>
  );
}

// ─── My Updates: the form, then your own history ───

async function MyUpdates({ viewer, params }: { viewer: AuthEmployee; params: Params }) {
  const [form, history] = await Promise.all([getUpdateForm(viewer, params.date), getPersonUpdates(viewer, viewer.id, params.month)]);
  const href = (month: string | null) => `/updates?view=mine${month ? `&month=${month}` : ""}`;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)] sm:p-6">
        {/* Remount per day so the form starts from that day's saved update. */}
        <UpdateForm key={form.dateKey} initial={form} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Your Updates</h2>
            <p className="text-xs text-muted-foreground tabular-nums">{historyStat(history.updates.length, history.workedDays, history.month)}</p>
          </div>
          <MonthNav monthKey={history.month} currentMonth={history.currentMonth} href={href} />
        </div>
        {history.updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates in {monthTitle(history.month)}. Add one above for any day you worked.</p>
        ) : (
          history.updates.map((u) => (
            <UpdateCard
              key={u.id}
              header={<h3 className="text-sm font-medium">{formatUpdateDay(u.dateKey)}</h3>}
              body={u.body}
              tasks={u.tasks}
              updatedAt={u.updatedAt}
              actions={
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href={`/updates?view=mine&date=${u.dateKey}${params.month ? `&month=${params.month}` : ""}`}>Edit</Link>
                </Button>
              }
            />
          ))
        )}
      </section>
    </div>
  );
}

function historyStat(updates: number, worked: number, month: string) {
  return `${updates} update${updates === 1 ? "" : "s"} · ${worked} day${worked === 1 ? "" : "s"} worked in ${monthTitle(month)}`;
}

// ─── Team: one day for everyone the viewer can see ───

async function TeamDay({ viewer, params }: { viewer: AuthEmployee; params: Params }) {
  const day = await getUpdatesDay(viewer, { date: params.date, teamId: params.team, projectId: params.project });
  if (!day) return null;
  const isToday = day.dateKey === day.today;
  const withUpdate = day.rows.filter((r) => r.update);
  const missing = day.rows.filter((r) => !r.update);
  const personHref = (id: string) => (id === viewer.id ? "/updates?view=mine" : `/updates?person=${id}`);

  return (
    <div className="space-y-5">
      {/* A plain GET form: the URL holds the day and filters, so views can be shared. */}
      <form action="/updates" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="updates-day" className="text-xs font-semibold text-muted-foreground">Day</label>
          <DatePicker key={day.dateKey} id="updates-day" name="date" defaultValue={day.dateKey} max={day.today} className="w-40" />
        </div>
        {day.scope.teams.length > 1 && (
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground">Team</span>
            <FormSelect name="team" defaultValue={day.teamId ?? ""} allLabel={day.scope.all ? "All Teams" : "My Teams"} options={day.scope.teams.map((t) => ({ value: t.id, label: t.name }))} aria-label="Team" />
          </div>
        )}
        <div className="space-y-1">
          <span className="block text-xs font-semibold text-muted-foreground">Project</span>
          <FormSelect name="project" defaultValue={day.projectId ?? ""} allLabel="All Projects" options={day.projects.map((p) => ({ value: p.id, label: p.name }))} aria-label="Project" />
        </div>
        <Button type="submit" size="sm" variant="outline" className="h-9">Show Updates</Button>
        {(!isToday || day.teamId || day.projectId) && <Button asChild size="sm" variant="ghost" className="h-9"><Link href="/updates">Reset</Link></Button>}
      </form>

      <div>
        <h2 className="text-sm font-medium">{isToday ? "Today" : formatUpdateDay(day.dateKey)} · {day.scope.label}</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {day.projectId
            ? `${withUpdate.length} update${withUpdate.length === 1 ? "" : "s"} linking this project`
            : `${day.addedCount} of ${day.workedCount} who worked added an update`}
        </p>
      </div>

      {day.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {day.projectId ? "No updates link this project's tasks on this day." : isToday ? "No one has clocked in yet today." : "No one clocked in on this day."}
        </p>
      ) : (
        <div className="space-y-3">
          {withUpdate.map(({ person, update }) => (
            <UpdateCard key={person.id} header={<PersonHeader person={person} href={personHref(person.id)} />} body={update!.body} tasks={update!.tasks} updatedAt={update!.updatedAt} />
          ))}
          {missing.length > 0 && (
            <section className="rounded-xl border border-border/70 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground">Not Added Yet · {missing.length}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {missing.map(({ person }) => (
                  <li key={person.id}>
                    <Link href={personHref(person.id)} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 py-0.5 pr-2.5 pl-0.5 text-xs hover:bg-accent/50">
                      <UserAvatar className="h-5 w-5" user={{ name: person.name, avatarUrl: person.avatarUrl }} textClassName="text-[8px]" />
                      {person.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── One person's history ───

async function PersonHistory({ viewer, personId, month }: { viewer: AuthEmployee; personId: string; month?: string }) {
  const history = await getPersonUpdates(viewer, personId, month);
  const href = (m: string | null) => `/updates?person=${personId}${m ? `&month=${m}` : ""}`;

  return (
    <div className="space-y-5">
      <Link href="/updates" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Team Updates
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
