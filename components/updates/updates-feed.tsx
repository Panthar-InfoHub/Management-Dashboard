"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PersonHeader, UpdateCard, formatUpdateDay } from "@/components/updates/update-card";
import { loadUpdatesFeedAction } from "@/lib/actions/daily-update.actions";
import type { FeedDay, UpdatesFeed as Feed } from "@/lib/updates/queries";
import { fromDateKey } from "@/lib/attendance/calendar";
import { cn, errorMessage } from "@/lib/utils";

const ALL = "__all";

function dayTitle(dateKey: string, today: string) {
  if (dateKey === today) return "Today";
  const yesterday = new Date(fromDateKey(today).getTime() - 86_400_000).toISOString().slice(0, 10);
  if (dateKey === yesterday) return "Yesterday";
  return formatUpdateDay(dateKey);
}

/**
 * Updates from everyone the viewer can see, newest day first. Filters change
 * the URL (so a view can be shared) while the current list stays on screen;
 * Load More appends older days without leaving the page.
 */
export function UpdatesFeed({ feed, projects, viewerId }: { feed: Feed; projects: { id: string; name: string }[]; viewerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [days, setDays] = useState(feed.days);
  const [nextStart, setNextStart] = useState(feed.nextStart);
  const [isNavigating, startNavigation] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  const go = (change: { date?: string | null; team?: string | null; project?: string | null }) => {
    const next = {
      date: change.date !== undefined ? change.date : feed.start === feed.today ? null : feed.start,
      team: change.team !== undefined ? change.team : feed.teamId,
      project: change.project !== undefined ? change.project : feed.projectId,
    };
    const params = new URLSearchParams();
    if (next.date && next.date !== feed.today) params.set("date", next.date);
    if (next.team) params.set("team", next.team);
    if (next.project) params.set("project", next.project);
    const qs = params.toString();
    startNavigation(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const loadMore = () => {
    if (!nextStart) return;
    startLoadMore(async () => {
      try {
        const more = await loadUpdatesFeedAction({ start: nextStart, teamId: feed.teamId, projectId: feed.projectId });
        setDays((d) => [...d, ...more.days]);
        setNextStart(more.nextStart);
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't load older updates. Try again."));
      }
    });
  };

  const personHref = (id: string) => (id === viewerId ? "/updates?view=mine" : `/updates?person=${id}`);
  const filtered = !!(feed.teamId || feed.projectId || feed.start !== feed.today);

  return (
    <div className="space-y-6">
      {/* One row, every control the same height. */}
      <div className="flex flex-wrap items-center gap-2">
        {feed.scope.teams.length > 1 && (
          <Select value={feed.teamId ?? ALL} onValueChange={(v) => go({ team: v === ALL ? null : v })}>
            <SelectTrigger className="w-44" aria-label="Team"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{feed.scope.all ? "All Teams" : "My Teams"}</SelectItem>
              {feed.scope.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={feed.projectId ?? ALL} onValueChange={(v) => go({ project: v === ALL ? null : v })}>
          <SelectTrigger className="w-44" aria-label="Project"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <DatePicker
            key={feed.start}
            value={feed.start === feed.today ? "" : feed.start}
            max={feed.today}
            onChange={(v) => v && go({ date: v })}
            placeholder="Jump to Date"
            aria-label="Jump to date"
            className="w-40"
          />
          {filtered && <Button variant="ghost" onClick={() => go({ date: null, team: null, project: null })}>Reset</Button>}
        </div>
      </div>

      <div className={cn("space-y-8 transition-opacity", isNavigating && "opacity-60")} aria-busy={isNavigating}>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {feed.projectId ? "No updates link this project's tasks in these days." : "No updates in these days."}
          </p>
        ) : (
          days.map((day) => <FeedDaySection key={day.dateKey} day={day} today={feed.today} projectFilter={!!feed.projectId} personHref={personHref} />)
        )}

        {nextStart ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? "Loading…" : "Load More"}</Button>
          </div>
        ) : days.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">That&rsquo;s everything.</p>
        ) : null}
      </div>
    </div>
  );
}

function FeedDaySection({ day, today, projectFilter, personHref }: { day: FeedDay; today: string; projectFilter: boolean; personHref: (id: string) => string }) {
  const isToday = day.dateKey === today;
  return (
    <section className="space-y-3" aria-labelledby={`day-${day.dateKey}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
        <h2 id={`day-${day.dateKey}`} className="text-sm font-semibold">{dayTitle(day.dateKey, today)}</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {projectFilter
            ? `${day.updates.length} update${day.updates.length === 1 ? "" : "s"}`
            : `${day.addedCount} of ${day.workedCount} added`}
        </p>
      </div>

      {day.updates.length === 0 && day.missing.length === 0 && (
        <p className="text-sm text-muted-foreground">{isToday ? "No one has clocked in yet today." : "No one worked this day."}</p>
      )}

      {day.updates.map((u) => (
        <UpdateCard key={u.id} header={<PersonHeader person={u.person} href={personHref(u.person.id)} />} body={u.body} tasks={u.tasks} updatedAt={u.updatedAt} />
      ))}

      {day.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{isToday ? "Not added yet" : "No update"}:</span>
          {day.missing.map((p) => (
            <Link key={p.id} href={personHref(p.id)} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 py-0.5 pr-2.5 pl-0.5 text-xs hover:bg-accent/50">
              <UserAvatar className="h-5 w-5" user={{ name: p.name, avatarUrl: p.avatarUrl }} textClassName="text-[8px]" />
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
