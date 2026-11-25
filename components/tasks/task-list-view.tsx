"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { format, isPast, isToday, endOfDay } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DoneNoteDialog } from "@/components/tasks/done-note-dialog";
import { bulkUpdateTasksAction, type BulkTaskChange } from "@/lib/actions/task.actions";
import { errorMessage } from "@/lib/errors";
import { taskKey } from "@/lib/tasks/keys";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any -- board tasks come untyped from the board */
type Task = any;
type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE", "CANCELLED"];
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", TESTING: "Testing", DONE: "Done", CANCELLED: "Cancelled" };
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_LABELS: Record<string, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const PRIORITY_DOT: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-blue-500", LOW: "bg-gray-400" };

const SORTS = { id: "ID", title: "Task", status: "Status", priority: "Priority", owner: "Owner", due: "Due Date" } as const;
type SortKey = keyof typeof SORTS;
const GROUPS = { none: "No Grouping", status: "Status", owner: "Owner", priority: "Priority", project: "Project" } as const;
type GroupKey = keyof typeof GROUPS;

const ownerOf = (t: Task): Person | null => t.owner ?? t.assignees?.[0] ?? null;
const nameOf = (p: Person | null) => (p ? `${p.firstName} ${p.lastName}` : "");

function compare(a: Task, b: Task, sort: SortKey): number {
  switch (sort) {
    case "id": return (taskKey(a) ?? "").localeCompare(taskKey(b) ?? "", undefined, { numeric: true });
    case "title": return a.title.localeCompare(b.title);
    case "status": return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "priority": return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    case "owner": return (nameOf(ownerOf(a)) || "~").localeCompare(nameOf(ownerOf(b)) || "~");
    case "due": {
      // Tasks without a date go last either way.
      if (!a.dueDate || !b.dueDate) return a.dueDate ? -1 : b.dueDate ? 1 : 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  }
}

function groupOf(t: Task, group: GroupKey): { key: string; label: string; order: number } {
  switch (group) {
    case "status": return { key: t.status, label: STATUS_LABELS[t.status] ?? t.status, order: STATUS_ORDER.indexOf(t.status) };
    case "priority": return { key: t.priority, label: PRIORITY_LABELS[t.priority] ?? t.priority, order: PRIORITY_ORDER.indexOf(t.priority) };
    case "owner": {
      const o = ownerOf(t);
      return { key: o?.id ?? "none", label: o ? nameOf(o) : "No Owner", order: o ? 0 : 1 };
    }
    case "project": return { key: t.projectId ?? "general", label: t.project?.name ?? "General", order: t.projectId ? 0 : 1 };
    default: return { key: "all", label: "", order: 0 };
  }
}

export function TaskListView({ tasks, employees }: { tasks: Task[]; employees: Person[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = (searchParams.get("sort") as SortKey) in SORTS ? (searchParams.get("sort") as SortKey) : "due";
  const dir = searchParams.get("dir") === "desc" ? -1 : 1;
  const group = (searchParams.get("group") as GroupKey) in GROUPS ? (searchParams.get("group") as GroupKey) : "none";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [doneOpen, setDoneOpen] = useState(false);

  // Sort and grouping live in the URL, so a view can be shared.
  const setParam = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) v === null ? params.delete(k) : params.set(k, v);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const toggleSort = (key: SortKey) =>
    setParam(sort === key ? { sort: key, dir: dir === 1 ? "desc" : null } : { sort: key === "due" ? null : key, dir: null });

  const groups = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => compare(a, b, sort) * dir);
    const map = new Map<string, { label: string; order: number; rows: Task[] }>();
    for (const t of sorted) {
      const g = groupOf(t, group);
      if (!map.has(g.key)) map.set(g.key, { label: g.label, order: g.order, rows: [] });
      map.get(g.key)!.rows.push(t);
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [tasks, sort, dir, group]);

  // Drop selections that the filters have hidden.
  const visibleIds = new Set(tasks.map((t) => t.id));
  const chosen = [...selected].filter((id) => visibleIds.has(id));
  const allChosen = chosen.length > 0 && chosen.length === tasks.length;

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const apply = (change: BulkTaskChange, label: string) => {
    startTransition(async () => {
      try {
        const res = await bulkUpdateTasksAction(chosen, change);
        if (res.updated > 0) toast.success(`${res.updated} task${res.updated === 1 ? "" : "s"} updated · ${label}`);
        if (res.skipped > 0) toast.warning(`${res.skipped} not changed: ${res.firstReason}`);
        setSelected(new Set());
        setDoneOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err, "Tasks not updated. Try again."));
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Group by</span>
        <Select value={group} onValueChange={(v) => setParam({ group: v === "none" ? null : v })}>
          <SelectTrigger size="sm" className="h-8 min-w-32 text-xs" aria-label="Group by"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(GROUPS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
      </div>

      {chosen.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background p-2 shadow-sm">
          <span className="px-1 text-xs font-medium">{chosen.length} selected</span>
          <Select value="" onValueChange={(v) => (v === "DONE" ? setDoneOpen(true) : apply({ kind: "status", status: v }, STATUS_LABELS[v]))} disabled={isPending}>
            <SelectTrigger size="sm" className="h-8 text-xs" aria-label="Set status"><SelectValue placeholder="Set Status" /></SelectTrigger>
            <SelectContent>{STATUS_ORDER.slice(0, 5).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value="" onValueChange={(v) => apply({ kind: "priority", priority: v }, PRIORITY_LABELS[v])} disabled={isPending}>
            <SelectTrigger size="sm" className="h-8 text-xs" aria-label="Set priority"><SelectValue placeholder="Set Priority" /></SelectTrigger>
            <SelectContent>{PRIORITY_ORDER.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value="" onValueChange={(v) => apply({ kind: "owner", ownerId: v }, `owner ${nameOf(employees.find((e) => e.id === v) ?? null)}`)} disabled={isPending}>
            <SelectTrigger size="sm" className="h-8 text-xs" aria-label="Set owner"><SelectValue placeholder="Set Owner" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{nameOf(e)}</SelectItem>)}</SelectContent>
          </Select>
          <DatePicker key={chosen.join()} className="w-40" placeholder="Set Due Date" onChange={(v) => apply({ kind: "dueDate", dueDate: v || null }, v ? `due ${v}` : "no due date")} disabled={isPending} aria-label="Set due date" />
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => apply({ kind: "dueDate", dueDate: null }, "no due date")} disabled={isPending}>Clear Due Date</Button>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setSelected(new Set())} aria-label="Clear selection"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border/40 bg-background">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox aria-label="Select all" checked={allChosen} onCheckedChange={(c) => setSelected(c === true ? new Set(tasks.map((t) => t.id)) : new Set())} />
              </TableHead>
              {(Object.keys(SORTS) as SortKey[]).map((key) => (
                <TableHead key={key} className={cn("text-[11px] font-medium uppercase tracking-wider", key === "title" && "min-w-[260px]")}>
                  <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
                    {SORTS[key]}
                    {sort === key && (dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <GroupRows key={g.label || "all"} label={group === "none" ? null : g.label} rows={g.rows} selected={selected} onToggle={toggle} />
            ))}
          </TableBody>
        </Table>
      </div>

      <DoneNoteDialog
        open={doneOpen}
        taskTitle={`${chosen.length} task${chosen.length === 1 ? "" : "s"}`}
        pending={isPending}
        onConfirm={(note) => apply({ kind: "status", status: "DONE", doneNote: note }, "Done")}
        onCancel={() => setDoneOpen(false)}
      />
    </div>
  );
}

function GroupRows({ label, rows, selected, onToggle }: { label: string | null; rows: Task[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <>
      {label !== null && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={7} className="py-1.5 text-xs font-semibold">{label} · {rows.length}</TableCell>
        </TableRow>
      )}
      {rows.map((task) => {
        const owner = ownerOf(task);
        const others = (task.assignees?.length ?? 0) - (owner ? 1 : 0);
        const date = task.dueDate ? new Date(task.dueDate) : null;
        const overdue = date && !["DONE", "CANCELLED"].includes(task.status) && !isToday(date) && isPast(endOfDay(date));
        return (
          <TableRow key={task.id} data-state={selected.has(task.id) ? "selected" : undefined}>
            <TableCell><Checkbox aria-label={`Select ${task.title}`} checked={selected.has(task.id)} onCheckedChange={() => onToggle(task.id)} /></TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{taskKey(task) ?? "—"}</TableCell>
            <TableCell>
              <Link href={`/tasks/${task.id}`} className="block min-w-0 hover:underline">
                <span className="block truncate text-sm font-medium">{task.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{task.project?.name ?? "General"}{task.parent ? ` · ↳ ${task.parent.title}` : ""}</span>
              </Link>
            </TableCell>
            <TableCell><Badge variant="outline" className={cn("text-[10px] shadow-none", task.status === "CANCELLED" && "line-through")}>{STATUS_LABELS[task.status] ?? task.status}</Badge></TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5 text-xs"><span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])} />{PRIORITY_LABELS[task.priority]}</span>
            </TableCell>
            <TableCell>
              {owner ? (
                <span className="flex items-center gap-2">
                  <UserAvatar className="h-6 w-6" user={owner} textClassName="text-[10px]" />
                  <span className="truncate text-xs font-medium">{nameOf(owner)}</span>
                  {others > 0 && <span className="text-[10px] text-muted-foreground">+{others}</span>}
                </span>
              ) : <span className="text-xs italic text-muted-foreground">No owner</span>}
            </TableCell>
            <TableCell className={cn("text-xs tabular-nums", overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              {date ? `${format(date, "MMM d, yyyy")}${overdue ? " · Overdue" : ""}` : "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
