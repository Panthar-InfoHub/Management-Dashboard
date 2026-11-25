import { Suspense } from "react";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { getMyTasks } from "@/lib/queries/task.queries";
import { todayKey } from "@/lib/attendance/calendar";
import { DUE_BUCKETS, dueBucket, type DueBucket } from "@/lib/tasks/my-tasks";
import { taskKey } from "@/lib/tasks/keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

const TZ = "Asia/Kolkata";
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", TESTING: "Testing" };
const PRIORITY_DOT: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-blue-500", LOW: "bg-gray-400" };

type Row = Awaited<ReturnType<typeof getMyTasks>>["assigned"][number];

export default function MyTasksPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Everything assigned to you that is still open, by due date.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs"><Link href="/tasks"><LayoutGrid className="h-3.5 w-3.5" /> Board</Link></Button>
          <Button asChild size="sm" className="gap-1.5 text-xs"><Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> New Task</Link></Button>
        </div>
      </div>
      <Suspense fallback={<div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}>
        <MyTasksBody />
      </Suspense>
    </div>
  );
}

function TaskRow({ task, meId }: { task: Row; meId: string }) {
  const key = taskKey(task);
  const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ }) : null;
  return (
    <li>
      <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} title={`Priority: ${task.priority}`} />
        {key && <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{key}</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{task.title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {task.project?.name ?? "General"}{task.parent ? ` · ↳ ${task.parent.title}` : ""}
          </span>
        </span>
        <Badge variant="outline" className="hidden shrink-0 text-[10px] shadow-none sm:inline-flex">{STATUS_LABELS[task.status] ?? task.status}</Badge>
        {task.ownerId === meId ? (
          <Badge variant="outline" className="shrink-0 text-[10px] shadow-none">Owner</Badge>
        ) : task.owner ? (
          <UserAvatar className="h-5 w-5 shrink-0" user={task.owner} textClassName="text-[8px]" title={`Owner: ${task.owner.firstName} ${task.owner.lastName}`} />
        ) : null}
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{due ?? "—"}</span>
      </Link>
    </li>
  );
}

async function MyTasksBody() {
  const { meId, assigned, toReview } = await getMyTasks();
  const today = todayKey(TZ);
  const groups = new Map<DueBucket, Row[]>(DUE_BUCKETS.map((b) => [b.id, []]));
  for (const t of assigned) groups.get(dueBucket(t.dueDate ? todayKey(TZ, new Date(t.dueDate)) : null, today))!.push(t);

  if (assigned.length === 0 && toReview.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Nothing assigned to you. New tasks you&apos;re added to show up here.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {assigned.length} open · {assigned.filter((t) => t.ownerId === meId).length} you own · {groups.get("overdue")!.length} overdue
      </p>
      {toReview.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-purple-500/30">
          <h2 className="border-b border-border/40 bg-purple-500/5 px-4 py-2 text-xs font-semibold">Waiting for Your Review · {toReview.length}</h2>
          <ul className="divide-y divide-border/40">{toReview.map((t) => <TaskRow key={t.id} task={t} meId={meId} />)}</ul>
        </section>
      )}
      {DUE_BUCKETS.map((b) => {
        const rows = groups.get(b.id)!;
        if (rows.length === 0 && b.id !== "today") return null;
        return (
          <section key={b.id} className="overflow-hidden rounded-lg border border-border/50">
            <h2 className={cn("border-b border-border/40 bg-muted/20 px-4 py-2 text-xs font-semibold", b.id === "overdue" && "text-red-600 dark:text-red-400")}>
              {b.label} · {rows.length}
            </h2>
            {rows.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">{b.empty}</p>
            ) : (
              <ul className="divide-y divide-border/40">{rows.map((t) => <TaskRow key={t.id} task={t} meId={meId} />)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
