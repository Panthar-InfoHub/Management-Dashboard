// Dashboard blocks drawn in plain HTML (no chart library): fast, accessible,
// and readable in both themes.
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { taskKey } from "@/lib/tasks/keys";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", TESTING: "Testing" };
// Stages are ordered, so they share one neutral ramp from light to dark.
const STAGE_FILL: Record<string, string> = { TODO: "bg-neutral-300 dark:bg-neutral-700", IN_PROGRESS: "bg-neutral-400 dark:bg-neutral-500", REVIEW: "bg-neutral-600 dark:bg-neutral-400", TESTING: "bg-neutral-800 dark:bg-neutral-200" };
const PRIORITY_DOT: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-transparent", LOW: "bg-transparent" };

export function StageBreakdown({ stages }: { stages: { status: string; count: number }[] }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">No open work.</p>;
  return (
    <div className="space-y-4">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={stages.map((s) => `${STAGE_LABELS[s.status]} ${s.count}`).join(", ")}>
        {stages.filter((s) => s.count > 0).map((s) => (
          <div key={s.status} className={cn("h-full first:rounded-l-full last:rounded-r-full", STAGE_FILL[s.status])} style={{ width: `${(s.count / total) * 100}%` }} title={`${STAGE_LABELS[s.status]}: ${s.count}`} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stages.map((s) => (
          <div key={s.status} className="flex items-center justify-between gap-2 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground"><span className={cn("h-2.5 w-2.5 rounded-sm", STAGE_FILL[s.status])} />{STAGE_LABELS[s.status]}</dt>
            <dd className="font-medium tabular-nums">{s.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function WorkloadBars({ rows }: { rows: { id: string; name: string; open: number; overdue: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No open tasks have an owner yet.</p>;
  const max = Math.max(...rows.map((r) => r.open));
  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <Link href={`/tasks?view=list&assignee=${r.id}`} className="truncate hover:underline">{r.name}</Link>
            <div className="flex h-2 gap-0.5" title={`${r.open} open, ${r.overdue} overdue`}>
              <div className="rounded-full bg-foreground/70" style={{ width: `${((r.open - r.overdue) / max) * 100}%` }} />
              {r.overdue > 0 && <div className="rounded-full bg-red-500" style={{ width: `${(r.overdue / max) * 100}%` }} />}
            </div>
            <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
              {r.open}{r.overdue > 0 && <span className="text-red-600 dark:text-red-400"> · {r.overdue} late</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/70" /> On track</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Overdue</span>
      </p>
    </div>
  );
}

type AttentionTask = {
  id: string; title: string; priority: string; dueDate: Date | null; number: number | null; projectId: string | null; overdue: boolean;
  project: { id: string; name: string; key: string | null } | null;
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
};

/** Rows past `phone` are hidden on phones; past `wide` everywhere. CSS only, no client code. */
const capped = (i: number, phone: number, wide: number) => cn(i >= phone && "max-sm:hidden", i >= wide && "hidden");

/** "View all" footer, shown only when some rows are hidden at that width. */
function MoreLink({ href, total, phone, wide, noun }: { href: string; total: number; phone: number; wide: number; noun: string }) {
  if (total <= phone) return null;
  return (
    <Link
      href={href}
      className={cn(
        "-mx-5 -mb-5 mt-1 flex items-center justify-center border-t border-border/60 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        total <= wide && "sm:hidden"
      )}
    >
      View all {total} {noun} →
    </Link>
  );
}

export function AttentionList({ tasks, href = "/tasks?view=list&due=OVERDUE,WEEK" }: { tasks: AttentionTask[]; href?: string }) {
  if (tasks.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing overdue or due this week.</p>;
  const PHONE = 5, WIDE = 8;
  return (
    <>
      <ul className="-mx-5 divide-y divide-border/60">
        {tasks.map((t, i) => {
          const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";
          const dueCls = t.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground";
          return (
            <li key={t.id} className={capped(i, PHONE, WIDE)}>
              <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority])} title={`Priority: ${t.priority}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="font-mono">{taskKey(t)}</span> · {t.project?.name ?? "General"}
                    {/* Phones: the date sits on this line, so the title keeps its width. */}
                    {due && <span className={cn("sm:hidden", dueCls)}> · {t.overdue ? "Overdue " : ""}{due}</span>}
                  </span>
                </span>
                {t.owner && <UserAvatar className="h-6 w-6 shrink-0" user={t.owner} textClassName="text-[9px]" />}
                <span className={cn("hidden w-24 shrink-0 text-right text-xs tabular-nums sm:block", dueCls)}>
                  {t.overdue ? "Overdue · " : ""}{due}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <MoreLink href={href} total={tasks.length} phone={PHONE} wide={WIDE} noun="tasks" />
    </>
  );
}

type HealthRow = {
  id: string; name: string; key: string | null; progress: number; total: number; done: number; overdue: number; endDate: Date | null;
  health: { state: "late" | "behind" | "soon" | "ok" | "empty" | "done"; label: string; reason: string };
  lead: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
};
// Colour only where it means something: red late, amber needs a look, green finished.
const HEALTH_CLS: Record<HealthRow["health"]["state"], string> = {
  late: "text-red-700 bg-red-500/10 dark:text-red-400",
  behind: "text-amber-800 bg-amber-500/10 dark:text-amber-400",
  soon: "text-amber-800 bg-amber-500/10 dark:text-amber-400",
  ok: "text-muted-foreground bg-muted",
  empty: "text-muted-foreground bg-muted",
  done: "text-emerald-800 bg-emerald-500/10 dark:text-emerald-400",
};

export function ProjectHealthList({ projects }: { projects: HealthRow[] }) {
  if (projects.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No active projects.</p>;
  // Already sorted most urgent first, so the cut keeps what matters.
  const PHONE = 5, WIDE = 8;
  return (
    <>
    <ul className="-mx-5 divide-y divide-border/60">
      {projects.map((p, i) => (
        <li key={p.id} className={capped(i, PHONE, WIDE)}>
          <Link href={`/projects/${p.id}`} className="block px-5 py-3 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", HEALTH_CLS[p.health.state])}>{p.health.label}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/75" style={{ width: `${p.progress}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-medium tabular-nums">{p.progress}%</span>
            </div>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {p.health.reason} · {p.done}/{p.total} done<span className="max-sm:hidden"> · {p.lead.firstName} {p.lead.lastName}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
    <MoreLink href="/projects" total={projects.length} phone={PHONE} wide={WIDE} noun="projects" />
    </>
  );
}

export function StatList({ items }: { items: { label: string; value: number; href?: string; tone?: "critical" }[] }) {
  return (
    <dl className="-mx-5 divide-y divide-border/60">
      {items.map((i) => {
        const body = (
          <>
            <dt className="text-sm text-muted-foreground">{i.label}</dt>
            <dd className={cn("text-sm font-semibold tabular-nums", i.tone === "critical" && i.value > 0 && "text-red-600 dark:text-red-400")}>{i.value}</dd>
          </>
        );
        return i.href ? (
          <Link key={i.label} href={i.href} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/40">{body}</Link>
        ) : (
          <div key={i.label} className="flex items-center justify-between px-5 py-2.5">{body}</div>
        );
      })}
    </dl>
  );
}
