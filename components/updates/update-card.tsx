import Link from "next/link";
import type { ReactNode } from "react";
import { StatusIcon, STATUS_META } from "@/components/tasks/task-icons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fromDateKey } from "@/lib/attendance/calendar";
import type { UpdatePerson, UpdateTask } from "@/lib/updates/queries";

export function formatUpdateDay(dateKey: string) {
  return fromDateKey(dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatEditedAt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** Linked tasks as small chips that open the task. Status shown by icon and text. */
export function TaskChips({ tasks }: { tasks: UpdateTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Linked tasks">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link
            href={`/tasks/${t.id}`}
            title={`${t.project} · ${STATUS_META[t.status]?.label ?? t.status}`}
            className="inline-flex max-w-[280px] items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-xs hover:bg-accent/50"
          >
            <StatusIcon status={t.status} className="h-3.5 w-3.5" />
            {t.key && <span className="font-mono text-[11px] text-muted-foreground">{t.key}</span>}
            <span className="truncate">{t.title}</span>
            <span className="sr-only">({STATUS_META[t.status]?.label ?? t.status})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One update: an optional header (person or date), the text, and linked tasks. */
export function UpdateCard({
  header,
  body,
  tasks,
  updatedAt,
  actions,
}: {
  header: ReactNode;
  body: string;
  tasks: UpdateTask[];
  updatedAt: string;
  actions?: ReactNode;
}) {
  return (
    <article className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Saved {formatEditedAt(updatedAt)}</span>
          {actions}
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{body}</p>
      <TaskChips tasks={tasks} />
    </article>
  );
}

export function PersonHeader({ person, href }: { person: UpdatePerson; href?: string }) {
  const name = href ? <Link href={href} className="hover:underline">{person.name}</Link> : person.name;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar className="h-8 w-8" user={{ name: person.name, avatarUrl: person.avatarUrl }} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{[person.designation, person.team].filter(Boolean).join(" · ") || "No team"}</p>
      </div>
    </div>
  );
}
