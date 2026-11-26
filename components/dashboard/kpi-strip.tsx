import Link from "next/link";
import type { Kpis } from "@/lib/queries/dashboard.queries";
import { cn } from "@/lib/utils";

function Tile({ label, value, detail, href, tone }: { label: string; value: number; detail: React.ReactNode; href: string; tone?: "accent" | "critical" }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", tone === "critical" && value > 0 && "text-red-600 dark:text-red-400")}>
        {value.toLocaleString("en-IN")}
      </span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </Link>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  if (now === before) return <>same as last week</>;
  const up = now > before;
  return (
    <span className={up ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
      {up ? "▲" : "▼"} {Math.abs(now - before)} vs last week
    </span>
  );
}

export function KpiStrip({ k }: { k: Kpis }) {
  const mine = !k.org;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile label={mine ? "My Open Tasks" : "Open Tasks"} value={k.open} tone="accent" href={mine ? "/tasks/my" : "/tasks?view=list"} detail={`${k.inReview} in review`} />
      <Tile label="Overdue" value={k.overdue} tone="critical" href={mine ? "/tasks/my" : "/tasks?view=list&due=OVERDUE"} detail={k.overdue ? "past their due date" : "nothing late"} />
      <Tile label="Due in 7 Days" value={k.dueSoon} href={mine ? "/tasks/my" : "/tasks?view=list&due=WEEK"} detail="with a due date" />
      <Tile label="Done This Week" value={k.doneThisWeek} href="/tasks?view=list" detail={<Delta now={k.doneThisWeek} before={k.doneLastWeek} />} />
      <Tile label={mine ? "My Projects" : "Active Projects"} value={k.activeProjects} href="/projects" detail={k.org ? `${k.people} people` : "active now"} />
    </div>
  );
}
