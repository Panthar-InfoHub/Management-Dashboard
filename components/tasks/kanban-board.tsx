"use client";
import type { BoardTask } from "@/lib/queries/task.queries";
import { PriorityIcon, StatusIcon, TASK_PRIORITIES } from "@/components/tasks/task-icons";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle, ArrowRightLeft, Ban, CalendarClock, CalendarDays, CalendarRange, CalendarX, Columns3, FolderKanban, Inbox, ListChecks, ListTree,
  MessageSquare, Network, Plus, Rows3, Search, SignalHigh, SlidersHorizontal, UserRound, UserX, UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FacetFilter } from "@/components/tasks/board-filters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DoneNoteDialog } from "@/components/tasks/done-note-dialog";
import { TaskListView } from "@/components/tasks/task-list-view";
import { rebalanceColumnTasksAction, updateTaskStatusAction } from "@/lib/actions/task.actions";
import { errorMessage } from "@/lib/errors";
import { taskKey } from "@/lib/tasks/keys";
import { cn } from "@/lib/utils";

// Status moves locally as plain strings (optimistic drags), so loosen those fields.
export type Task = Omit<BoardTask, "status" | "completedAt"> & { status: string; completedAt: Date | string | null };
type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };

const COLUMNS = [
  { id: "TODO", title: "To Do", dot: "bg-neutral-400" },
  { id: "IN_PROGRESS", title: "In Progress", dot: "bg-blue-500" },
  { id: "REVIEW", title: "Review", dot: "bg-purple-500" },
  { id: "TESTING", title: "Testing", dot: "bg-amber-500" },
  { id: "DONE", title: "Done", dot: "bg-emerald-500" },
] as const;
const CANCELLED_COLUMN = { id: "CANCELLED", title: "Cancelled", dot: "bg-neutral-300" } as const;
const PRIORITY: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: "Critical", cls: "bg-red-500/10 text-red-700 dark:text-red-400" },
  HIGH: { label: "High", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  MEDIUM: { label: "Medium", cls: "bg-neutral-500/10 text-muted-foreground" },
  LOW: { label: "Low", cls: "bg-neutral-500/10 text-muted-foreground" },
};
const DONE_PREVIEW = 10;
const TZ = "Asia/Kolkata";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

const splitList = (raw: string) => raw.split(",").filter((v) => v && v !== "ALL");

/** Board filters live in the URL (shareable) but change without a server round trip. */
function useBoardParams() {
  const searchParams = useSearchParams();
  const get = (k: string, fallback = "ALL") => searchParams.get(k) || fallback;
  /** Multi-value filters are comma lists in the URL ("ALL" from old links means none). */
  const getList = (k: string) => searchParams.get(k) ?? "";
  const set = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "ALL" || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);
  return { get, getList, set };
}

/** Where a dragged card would land: its column and position. */
type DropTarget = { columnId: string; index: number } | null;

// ─── Card (memoized: dragging over the board doesn't re-render every card) ───

const TaskCard = memo(function TaskCard({
  task, columnId, index, dragging, today, onDragStart, onDragEnd, onDragOverCard, onMove,
}: {
  task: Task; columnId: string; index: number; dragging: boolean; today: string;
  /** Phones can't drag: "Move to" changes the column instead. */
  onMove: (taskId: string, columnId: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOverCard: (e: React.DragEvent, columnId: string, index: number) => void;
}) {
  const key = taskKey(task);
  const owner = task.owner ?? task.assignees?.[0] ?? null;
  const others = (task.assignees ?? []).filter((a: Person) => a.id !== owner?.id);
  const subTotal = task.subtasks?.length ?? 0;
  const subDone = task.subtasks?.filter((s) => s.status === "DONE").length ?? 0;
  const closed = task.status === "DONE" || task.status === "CANCELLED";
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueKey = due ? dayKey(due) : null;
  const dueTone = !dueKey || closed ? "muted" : dueKey < today ? "overdue" : dueKey === today ? "today" : "muted";
  const priority = PRIORITY[task.priority];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverCard(e, columnId, index)}
      className={cn(
        "group relative cursor-grab rounded-lg border border-border/70 bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors select-none hover:border-foreground/25 active:cursor-grabbing",
        dragging && "opacity-40",
        closed && "opacity-80"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {key && <span className="font-mono text-foreground/70">{key}</span>}
        <span className="min-w-0 flex-1 truncate">{task.project?.name ?? "General"}</span>
        {(task.priority === "HIGH" || task.priority === "CRITICAL") && (
          <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-medium", priority.cls)}>{priority.label}</span>
        )}
        {task.status !== "CANCELLED" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Above the card's full-size link, so tapping it doesn't open the task. */}
              <button type="button" className="relative z-10 -my-1 -mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden" aria-label={`Move ${task.title}`}>
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
              {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onMove(task.id, c.id)} className="gap-2">
                  <StatusIcon status={c.id} className="h-3.5 w-3.5" />{c.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {task.parent && <p className="mt-1 truncate text-[11px] text-muted-foreground">↳ {task.parent.title}</p>}
      <Link
        href={`/tasks/${task.id}`}
        draggable={false}
        className={cn(
          "mt-1.5 line-clamp-2 text-[13px] leading-snug font-medium text-foreground after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50",
          task.status === "CANCELLED" && "line-through"
        )}
      >
        {task.title}
      </Link>

      <div className="mt-3 flex items-center gap-2.5 text-[11px] text-muted-foreground">
        {due && (
          <span className={cn("tabular-nums", dueTone === "overdue" && "font-medium text-red-600 dark:text-red-400", dueTone === "today" && "font-medium text-amber-700 dark:text-amber-400")}>
            {dueTone === "overdue" ? "Overdue · " : dueTone === "today" ? "Today · " : ""}
            {due.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ })}
          </span>
        )}
        {subTotal > 0 && (
          <span className="flex items-center gap-1 tabular-nums" title={`${subDone} of ${subTotal} subtasks done`}><ListChecks className="h-3 w-3" />{subDone}/{subTotal}</span>
        )}
        {task._count?.comments > 0 && (
          <span className="flex items-center gap-1 tabular-nums" title={`${task._count.comments} comments`}><MessageSquare className="h-3 w-3" />{task._count.comments}</span>
        )}
        <span className="ml-auto flex items-center -space-x-1.5">
          {owner ? (
            <UserAvatar className="h-5 w-5 ring-2 ring-card" user={owner} textClassName="text-[8px]" title={`Owner: ${owner.firstName} ${owner.lastName}`} />
          ) : (
            <span className="rounded border border-dashed border-border px-1 text-[10px]">No owner</span>
          )}
          {others.slice(0, 2).map((p: Person) => <UserAvatar key={p.id} className="h-5 w-5 ring-2 ring-card" user={p} textClassName="text-[8px]" />)}
          {others.length > 2 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[8px] font-medium ring-2 ring-card">+{others.length - 2}</span>}
        </span>
      </div>
    </div>
  );
});

// ─── Board ───

export function KanbanBoard({
  initialTasks,
  allowedProjects = [],
  allowedTeams = [],
  allEmployees = [],
  currentEmployeeId,
}: {
  initialTasks: Task[];
  allowedProjects?: { id: string; name: string }[];
  allowedTeams?: { id: string; name: string }[];
  allEmployees?: Person[];
  currentEmployeeId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget>(null);
  const [pendingDone, setPendingDone] = useState<{ taskId: string; order: number } | null>(null);
  const [savingDone, setSavingDone] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [today] = useState(() => dayKey(new Date()));
  // Moves still on their way to the server; a refresh mustn't undo them.
  const inFlight = useRef(new Map<string, { status: string; order: number }>());
  const { get, getList, set } = useBoardParams();

  useEffect(() => {
    setTasks(initialTasks.map((t) => {
      const f = inFlight.current.get(t.id);
      return f ? { ...t, status: f.status, order: f.order } : t;
    }));
  }, [initialTasks]);

  const view = get("view", "board");
  const search = get("search", "");
  // Raw strings keep the lists stable between renders, so memos don't recompute for nothing.
  const teamsRaw = getList("team"), projectsRaw = getList("project"), assigneesRaw = getList("assignee"), prioritiesRaw = getList("priority"), duesRaw = getList("due");
  const teams = useMemo(() => splitList(teamsRaw), [teamsRaw]);
  const projects = useMemo(() => splitList(projectsRaw), [projectsRaw]);
  const assignees = useMemo(() => splitList(assigneesRaw), [assigneesRaw]);
  const priorities = useMemo(() => splitList(prioritiesRaw), [prioritiesRaw]);
  const dues = useMemo(() => splitList(duesRaw), [duesRaw]);
  const setList = (k: string, values: string[]) => set({ [k]: values.length ? values.join(",") : null });
  const showSubtasks = get("subtasks", "") === "1";
  const showCancelled = get("cancelled", "") === "1";
  const [searchDraft, setSearchDraft] = useState(search);

  const weekKey = useMemo(() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() + 7);
    return dayKey(d);
  }, [today]);

  /** The one due bucket a task falls in: overdue (open, past due), next 7 days, later, or none. */
  const dueBucket = useCallback((t: Task) => {
    if (!t.dueDate) return "NONE";
    const k = dayKey(new Date(t.dueDate));
    const open = t.status !== "DONE" && t.status !== "CANCELLED";
    if (open && k < today) return "OVERDUE";
    if (k >= today && k <= weekKey) return "WEEK";
    return "LATER";
  }, [today, weekKey]);

  // Tasks the toggles allow at all; filters and their counts work from this.
  const base = useMemo(
    () => tasks.filter((t) => (showSubtasks || !t.parentId || !!search.trim()) && (showCancelled || t.status !== "CANCELLED")),
    [tasks, showSubtasks, showCancelled, search]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mine = assignees.includes("ME"), none = assignees.includes("NONE");
    const people = assignees.filter((a) => a !== "ME" && a !== "NONE");
    return base.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && (taskKey(t) ?? "").toLowerCase() !== q && !(t.project?.name ?? "").toLowerCase().includes(q)) return false;
      if (teams.length && !teams.includes(t.project?.team?.id ?? "")) return false;
      if (projects.length && !projects.includes(t.projectId ?? "GENERAL")) return false;
      if (assignees.length) {
        const ids = (t.assignees ?? []).map((a) => a.id);
        const hit = (mine && ids.includes(currentEmployeeId)) || (none && ids.length === 0) || people.some((p) => ids.includes(p));
        if (!hit) return false;
      }
      if (priorities.length && !priorities.includes(t.priority)) return false;
      if (dues.length && !dues.includes(dueBucket(t))) return false;
      return true;
    });
  }, [base, search, teams, projects, assignees, priorities, dues, currentEmployeeId, dueBucket]);

  /** How many tasks each filter value would match, for the counts in the menus. */
  const counts = useMemo(() => {
    const c = { project: new Map<string, number>(), person: new Map<string, number>(), priority: new Map<string, number>(), due: new Map<string, number>(), team: new Map<string, number>() };
    const add = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    for (const t of base) {
      add(c.project, t.projectId ?? "GENERAL");
      add(c.priority, t.priority);
      add(c.due, dueBucket(t));
      if (t.project?.team?.id) add(c.team, t.project.team.id);
      const ids = (t.assignees ?? []).map((a) => a.id);
      if (ids.length === 0) add(c.person, "NONE");
      for (const id of ids) add(c.person, id);
      if (ids.includes(currentEmployeeId)) add(c.person, "ME");
    }
    return c;
  }, [base, dueBucket, currentEmployeeId]);

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], TESTING: [], DONE: [], CANCELLED: [] };
    for (const t of filtered) (map[t.status] ??= []).push(t);
    for (const k of ["TODO", "IN_PROGRESS", "REVIEW", "TESTING"]) map[k].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
    map.DONE.sort((a, b) => +new Date(b.completedAt ?? 0) - +new Date(a.completedAt ?? 0));
    return map;
  }, [filtered]);

  // ─── Drag and drop (stable handlers keep the memoized cards still) ───

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("taskId", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  }, []);
  const onDragEnd = useCallback(() => { setDraggedId(null); setDrop(null); }, []);
  const onDragOverCard = useCallback((e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
    // Only re-render when the insertion point actually moves.
    setDrop((prev) => (prev && prev.columnId === columnId && prev.index === at ? prev : { columnId, index: at }));
  }, []);
  const onDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDrop((prev) => (prev?.columnId === columnId ? prev : { columnId, index: (byColumn[columnId] ?? []).length }));
  };

  /** Midpoint ordering, so a move writes one row. */
  const orderAt = (list: Task[], i: number) => {
    if (list.length === 0) return 1000;
    if (i <= 0) return (list[0].order || 1000) - 500;
    if (i >= list.length) return (list[list.length - 1].order || list.length * 1000) + 500;
    const a = list[i - 1].order ?? 0, b = list[i].order ?? 0;
    return a < b ? (a + b) / 2 : a + 500;
  };

  const persist = async (taskId: string, status: string, order: number, previous: { status: string; order: number }, note?: string) => {
    inFlight.current.set(taskId, { status, order });
    try {
      await updateTaskStatusAction(taskId, status, order, note);
      return true;
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...previous } : t)));
      toast.error(errorMessage(err, "Task not moved. Try again."));
      return false;
    } finally {
      inFlight.current.delete(taskId);
    }
  };

  const onDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId") || draggedId;
    const target = drop;
    setDraggedId(null);
    setDrop(null);
    if (taskId) await moveTask(taskId, columnId, target?.columnId === columnId ? target.index : null);
  };

  /** Move a task to a column (at a position, or the end): from a drop, or "Move to" on phones. */
  const moveTask = async (taskId: string, columnId: string, at: number | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (columnId === "CANCELLED" && task.status !== "CANCELLED") {
      toast.info("Open the task and use Cancel Task to give a reason");
      return;
    }

    const others = (byColumn[columnId] ?? []).filter((t) => t.id !== taskId);
    const index = at !== null ? Math.min(at, others.length) : others.length;
    const order = orderAt(others, index);
    if (task.status === columnId && Math.abs((task.order ?? 0) - order) < 1e-6) return;

    // Done asks what was done first; nothing moves until then.
    if (columnId === "DONE" && task.status !== "DONE") {
      setPendingDone({ taskId: task.id, order });
      return;
    }

    const previous = { status: task.status, order: task.order ?? 0 };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: columnId, order } : t)));
    const ok = await persist(task.id, columnId, order, previous);
    // Orders can get too close after many moves; respace the column now and then.
    if (ok && index > 0 && index < others.length && Math.abs((others[index].order ?? 0) - (others[index - 1].order ?? 0)) < 0.01) {
      const ids = [...others.slice(0, index).map((t) => t.id), task.id, ...others.slice(index).map((t) => t.id)];
      rebalanceColumnTasksAction(ids).catch(() => {});
    }
  };

  const confirmDone = async (note: string) => {
    if (!pendingDone) return;
    const task = tasks.find((t) => t.id === pendingDone.taskId);
    if (!task) {
      setPendingDone(null);
      return;
    }
    setSavingDone(true);
    const previous = { status: task.status, order: task.order ?? 0 };
    const ok = await persist(task.id, "DONE", pendingDone.order, previous, note);
    if (ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "DONE", order: pendingDone.order, completedAt: new Date().toISOString() } : t)));
      toast.success(`${taskKey(task) ?? "Task"} done`);
      setPendingDone(null);
    }
    setSavingDone(false);
  };

  // Cards are memoized; give them a callback that never changes but always runs the latest move.
  const moveRef = useRef(moveTask);
  useEffect(() => { moveRef.current = moveTask; });
  const onMoveCard = useCallback((taskId: string, columnId: string) => { void moveRef.current(taskId, columnId, null); }, []);

  // ─── Toolbar ───

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mineOnly = assignees.length === 1 && assignees[0] === "ME";
  // "/" jumps to search, unless you're already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const onSearch = (v: string) => {
    setSearchDraft(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => set({ search: v }), 200);
  };
  const active = [teams, projects, assignees, priorities, dues].some((l) => l.length > 0) || !!search;
  const reset = () => {
    setSearchDraft("");
    set({ search: null, team: null, project: null, assignee: null, priority: null, due: null });
  };
  const columns = showCancelled ? [...COLUMNS, CANCELLED_COLUMN] : COLUMNS;
  const openCount = filtered.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={searchDraft}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { onSearch(""); e.currentTarget.blur(); } }}
            placeholder="Search or KX-12"
            className="h-9 pr-7 pl-8 sm:h-8 md:text-sm"
            aria-label="Search tasks"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground sm:block">/</kbd>
        </div>

        {/* Filters: one row that scrolls sideways on phones, wraps on wider screens. */}
        <div className="-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">

        <button
          type="button"
          aria-pressed={mineOnly}
          onClick={() => setList("assignee", mineOnly ? [] : ["ME"])}
          className={cn("flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", mineOnly ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted/60")}
        >
          <UserRound className="h-3.5 w-3.5" /> Mine
        </button>

        <FacetFilter
          label="Project" plural="projects" icon={<FolderKanban />}
          selected={projects} onChange={(v) => setList("project", v)}
          pinned={[{ value: "GENERAL", label: "General", icon: <Inbox className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.project.get("GENERAL") ?? 0 }]}
          options={allowedProjects.map((p) => ({ value: p.id, label: p.name, count: counts.project.get(p.id) ?? 0 }))}
        />
        <FacetFilter
          label="Assignee" plural="people" icon={<UsersRound />}
          selected={assignees} onChange={(v) => setList("assignee", v)}
          pinned={[
            { value: "ME", label: "Me", icon: <UserRound className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.person.get("ME") ?? 0 },
            { value: "NONE", label: "Unassigned", icon: <UserX className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.person.get("NONE") ?? 0 },
          ]}
          options={allEmployees.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}`, icon: <UserAvatar className="h-4 w-4" user={p} textClassName="text-[7px]" />, count: counts.person.get(p.id) ?? 0 }))}
        />
        <FacetFilter
          label="Priority" plural="priorities" icon={<SignalHigh />} searchable={false}
          selected={priorities} onChange={(v) => setList("priority", v)}
          options={TASK_PRIORITIES.map((k) => ({ value: k, label: PRIORITY[k].label, icon: <PriorityIcon priority={k} className="h-3.5 w-3.5" />, count: counts.priority.get(k) ?? 0 }))}
        />
        <FacetFilter
          label="Due" plural="dates" icon={<CalendarClock />} searchable={false}
          selected={dues} onChange={(v) => setList("due", v)}
          options={[
            { value: "OVERDUE", label: "Overdue", icon: <AlertCircle className="h-3.5 w-3.5 text-red-600" />, count: counts.due.get("OVERDUE") ?? 0 },
            { value: "WEEK", label: "Next 7 days", icon: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.due.get("WEEK") ?? 0 },
            { value: "LATER", label: "Later", icon: <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.due.get("LATER") ?? 0 },
            { value: "NONE", label: "No due date", icon: <CalendarX className="h-3.5 w-3.5 text-muted-foreground" />, count: counts.due.get("NONE") ?? 0 },
          ]}
        />
        {(allowedTeams.length > 1 || teams.length > 0) && (
          <FacetFilter
            label="Team" plural="teams" icon={<Network />}
            selected={teams} onChange={(v) => setList("team", v)}
            options={allowedTeams.map((t) => ({ value: t.id, label: t.name, count: counts.team.get(t.id) ?? 0 }))}
          />
        )}

        {active && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={reset}><X className="h-3.5 w-3.5" /> Clear</Button>
        )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground tabular-nums lg:inline">{openCount} open · {filtered.length} shown</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Display
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Show on board</DropdownMenuLabel>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                <span className="flex items-center gap-2"><ListTree className="h-3.5 w-3.5 text-muted-foreground" /> Subtasks as cards</span>
                <Switch checked={showSubtasks} onCheckedChange={(c) => set({ subtasks: c ? "1" : null })} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                <span className="flex items-center gap-2"><Ban className="h-3.5 w-3.5 text-muted-foreground" /> Cancelled tasks</span>
                <Switch checked={showCancelled} onCheckedChange={(c) => set({ cancelled: c ? "1" : null })} />
              </label>
            </DropdownMenuContent>
          </DropdownMenu>
          <div role="radiogroup" aria-label="Layout" className="flex rounded-md border border-border bg-background p-0.5">
            {([["board", Columns3, "Board"], ["list", Rows3, "List"]] as const).map(([v, Icon, label]) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} aria-label={label} title={label} onClick={() => set({ view: v === "board" ? null : v })} className={cn("flex h-6 w-7 items-center justify-center rounded-[5px] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "list" ? (
        <TaskListView tasks={filtered} employees={allEmployees} />
      ) : (
        <div className="-mx-4 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 sm:pb-4 md:snap-none">
          {columns.map((col) => {
            const list = byColumn[col.id] ?? [];
            const isDone = col.id === "DONE";
            const visible = isDone && !showAllDone ? list.slice(0, DONE_PREVIEW) : list;
            const hot = drop?.columnId === col.id;
            const bar = <div className="h-0.5 rounded-full bg-foreground" />;
            return (
              <section
                key={col.id}
                aria-label={col.title}
                onDragOver={(e) => onDragOverColumn(e, col.id)}
                onDrop={(e) => onDrop(e, col.id)}
                className={cn("flex min-h-0 w-[85vw] max-w-[320px] shrink-0 snap-start flex-col rounded-xl border transition-colors sm:w-[292px]", hot ? "border-foreground/30 bg-muted" : "border-border/60 bg-muted/50 dark:bg-muted/20")}
              >
                <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <StatusIcon status={col.id} className="h-3.5 w-3.5" />
                  <h2 className="text-xs font-semibold">{col.title}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
                  {col.id === "TODO" && (
                    <Link href={projects.length === 1 && projects[0] !== "GENERAL" ? `/tasks/new?project=${projects[0]}` : "/tasks/new"} className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none" aria-label="New task">
                      <Plus className="h-4 w-4" />
                    </Link>
                  )}
                </header>
                <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 pb-2">
                  {visible.map((t, i) => (
                    <div key={t.id} className="flex flex-col gap-2">
                      {hot && drop.index === i && bar}
                      <TaskCard task={t} columnId={col.id} index={i} dragging={draggedId === t.id} today={today} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOverCard={onDragOverCard} onMove={onMoveCard} />
                    </div>
                  ))}
                  {hot && drop.index >= visible.length && visible.length > 0 && bar}
                  {visible.length === 0 && (
                    <div className={cn("flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-6 text-center text-xs", hot ? "border-foreground/40 text-foreground" : "border-border text-muted-foreground")}>
                      {hot ? "Drop here" : col.id === "TODO" ? "Nothing to start" : col.id === "DONE" ? "Nothing done yet" : "Empty"}
                    </div>
                  )}
                  {isDone && list.length > DONE_PREVIEW && (
                    <button type="button" onClick={() => setShowAllDone((v) => !v)} className="rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground">
                      {showAllDone ? "Show fewer" : `Show ${list.length - DONE_PREVIEW} more`}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && tasks.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No tasks match these filters. <button type="button" onClick={reset} className="font-medium text-foreground underline-offset-2 hover:underline">Reset filters</button>
        </p>
      )}

      <DoneNoteDialog
        open={pendingDone !== null}
        taskTitle={tasks.find((t) => t.id === pendingDone?.taskId)?.title}
        pending={savingDone}
        onConfirm={confirmDone}
        onCancel={() => setPendingDone(null)}
      />
    </div>
  );
}
