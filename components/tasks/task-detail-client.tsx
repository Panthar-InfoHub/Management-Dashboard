"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, Link2, MoreHorizontal, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { TaskDetail } from "@/lib/queries/task.queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskComments } from "@/components/tasks/task-comments";
import { NewSubtaskDialog } from "@/components/tasks/new-subtask-dialog";
import { DoneNoteDialog } from "@/components/tasks/done-note-dialog";
import { PriorityIcon, PRIORITY_META, STATUS_META, StatusIcon, TASK_PRIORITIES, TASK_STATUSES } from "@/components/tasks/task-icons";
import {
  cancelTaskAction, deleteTaskAction, restoreTaskAction, setTaskAssigneesAction, setTaskBlockerAction, setTaskDueDateAction,
  setTaskOwnerAction, updateTaskPriorityAction, updateTaskStatusAction,
} from "@/lib/actions/task.actions";
import { taskKey } from "@/lib/tasks/keys";
import { cn, errorMessage } from "@/lib/utils";

type Person = { id: string; firstName: string; lastName: string; avatarUrl: string | null };
type SubtaskNode = { id: string; title: string; status: string; priority: string; dueDate: string | Date | null; parentId: string | null; number?: number | null; ownerId?: string | null; assignees: Person[] };
type BlockerOption = { id: string; title: string; status: string; number: number | null };

type TaskPatch = Partial<{ status: string; priority: string; dueDate: Date | null; assignees: Person[]; ownerId: string | null }>;
type SubtaskPatch = { id: string } & Partial<Pick<SubtaskNode, "status" | "assignees">>;

const fullName = (p: Person) => `${p.firstName} ${p.lastName}`.trim();
const fmtDate = (v: string | Date | null | undefined) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const dateKey = (v: string | Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

// ─── Small building blocks ───

/** One row in the properties list: label left, control right. */
function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** A quiet button that looks like plain text until hovered: the inline-edit trigger. */
const ghostField = "inline-flex h-8 max-w-full items-center gap-2 rounded-md px-2 -mx-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none";

function StatusMenu({ status, disabled, onChange, compact, doneBlockedReason }: { status: string; disabled?: boolean; onChange: (s: string) => void; compact?: boolean; doneBlockedReason?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.TODO;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={cn(ghostField, compact && "h-7 px-1.5 -mx-1.5 text-xs")} aria-label={`Status: ${meta.label}`}>
          <StatusIcon status={status} className={compact ? "h-3.5 w-3.5" : undefined} />
          <span className={cn(compact && "hidden sm:inline")}>{meta.label}</span>
          {!disabled && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {TASK_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => s !== status && onChange(s)} disabled={s === "DONE" && !!doneBlockedReason} title={s === "DONE" ? doneBlockedReason : undefined} className="gap-2.5 text-sm">
            <StatusIcon status={s} />
            <span className="flex-1">{STATUS_META[s].label}</span>
            {s === status && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityMenu({ priority, disabled, onChange }: { priority: string; disabled?: boolean; onChange: (p: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={ghostField} aria-label={`Priority: ${PRIORITY_META[priority]?.label}`}>
          <PriorityIcon priority={priority} />
          {PRIORITY_META[priority]?.label ?? priority}
          {!disabled && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {TASK_PRIORITIES.map((p) => (
          <DropdownMenuItem key={p} onClick={() => p !== priority && onChange(p)} className="gap-2.5 text-sm">
            <PriorityIcon priority={p} />
            <span className="flex-1">{PRIORITY_META[p].label}</span>
            {p === priority && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Pick assignees in place. With rights, a switch also lists people outside the project. */
function AssigneePicker({
  value, team, outsiders, disabled, onChange, children,
}: {
  value: Person[];
  team: Person[];
  outsiders: Person[];
  disabled?: boolean;
  onChange: (next: Person[], outside: boolean) => void;
  children: React.ReactNode;
}) {
  const teamIds = useMemo(() => new Set(team.map((p) => p.id)), [team]);
  const [showOutside, setShowOutside] = useState(() => value.some((p) => !teamIds.has(p.id)));
  const pool = showOutside && outsiders.length > 0 ? outsiders : team;
  const chosen = new Set(value.map((p) => p.id));
  // Already-assigned people stay listed even if they've left the project.
  const list = [...value.filter((p) => !pool.some((x) => x.id === p.id)), ...pool];

  const toggle = (p: Person) => {
    const next = chosen.has(p.id) ? value.filter((v) => v.id !== p.id) : [...value, p];
    onChange(next, next.some((v) => !teamIds.has(v.id)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Assign to…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              {list.map((p) => (
                <CommandItem key={p.id} value={`${fullName(p)} ${p.id}`} onSelect={() => toggle(p)} className="gap-2">
                  <Check className={cn("h-3.5 w-3.5", chosen.has(p.id) ? "opacity-100" : "opacity-0")} />
                  <UserAvatar className="h-5 w-5" user={p} textClassName="text-[8px]" />
                  <span className="flex-1 truncate">{fullName(p)}</span>
                  {!teamIds.has(p.id) && <span className="text-[11px] text-muted-foreground">Outside</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {outsiders.length > 0 && (
            <label className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5 text-xs">
              <span>
                <span className="block font-medium text-foreground">Outside the project</span>
                <span className="text-muted-foreground">List everyone in the company</span>
              </span>
              <Switch checked={showOutside} onCheckedChange={setShowOutside} />
            </label>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BlockerPicker({ options, current, disabled, onChange }: { options: BlockerOption[]; current: TaskDetail["blockedBy"]; disabled?: boolean; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button type="button" className={ghostField}>
          {current ? (
            <><StatusIcon status={current.status} /><span className="truncate">{current.title}</span></>
          ) : (
            <span className="text-muted-foreground">{disabled ? "None" : "Add blocker"}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Find a task…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No open tasks to pick.</CommandEmpty>
            {current && (
              <CommandGroup>
                <CommandItem value="__remove" onSelect={() => { onChange(null); setOpen(false); }} className="gap-2 text-destructive">
                  <X className="h-3.5 w-3.5" /> Remove blocker
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Open tasks">
              {options.map((t) => (
                <CommandItem key={t.id} value={`${t.title} ${t.id}`} onSelect={() => { onChange(t.id); setOpen(false); }} className="gap-2">
                  <StatusIcon status={t.status} />
                  <span className="flex-1 truncate">{t.title}</span>
                  {current?.id === t.id && <Check className="h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Page ───

export function TaskDetailClient({
  initialTask,
  projectTasks = [],
  subtaskTree = [],
  assignableEmployees = [],
  outsideEmployees = [],
  viewer,
  canEditDetails = true,
  canEditStatus = true,
  canDelete = false,
  canCancel = false,
  canOpenProject = true,
}: {
  initialTask: TaskDetail;
  projectTasks?: BlockerOption[];
  subtaskTree?: SubtaskNode[];
  assignableEmployees?: Person[];
  /** Everyone active: shown behind the "Outside the project" switch, only to those allowed. */
  outsideEmployees?: Person[];
  viewer: Person;
  canEditDetails?: boolean;
  canEditStatus?: boolean;
  canDelete?: boolean;
  /** Owner, creator or project lead. */
  canCancel?: boolean;
  /** False for people assigned from outside the project: they can't open its page. */
  canOpenProject?: boolean;
}) {
  const router = useRouter();
  // Optimistic layers: changes show at once and settle when the server revalidates.
  const [task, patchTask] = useOptimistic(initialTask, (current: TaskDetail, patch: TaskPatch) => ({ ...current, ...patch }) as TaskDetail);
  const [subtasks, patchSubtask] = useOptimistic(subtaskTree, (list: SubtaskNode[], patch: SubtaskPatch) =>
    list.map((t) => (t.id === patch.id ? { ...t, ...patch } : t))
  );
  const [isPending, startTransition] = useTransition();
  const [doneTarget, setDoneTarget] = useState<{ id: string; title: string; isSubtask: boolean } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const children = useMemo(() => subtasks.filter((t) => t.parentId === task.id), [subtasks, task.id]);
  const counted = children.filter((t) => t.status !== "CANCELLED");
  const doneCount = counted.filter((t) => t.status === "DONE").length;
  const openSubtasks = counted.length - doneCount;
  const key = taskKey(task);
  const isClosed = task.status === "DONE" || task.status === "CANCELLED";
  const parentDue = dateKey(task.dueDate) || undefined;
  const owner = task.assignees.find((a) => a.id === task.ownerId) ?? null;
  const helpers = task.assignees.filter((a) => a.id !== task.ownerId);

  /** Run a server change with an optimistic patch; toast on failure. */
  const run = (patch: () => void, action: () => Promise<unknown>, ok: string | null, fail: string) => {
    startTransition(async () => {
      patch();
      try {
        await action();
        if (ok) toast.success(ok);
      } catch (err) {
        toast.error(errorMessage(err, fail));
      }
    });
  };

  const changeStatus = (status: string) => {
    if (status === "DONE") return setDoneTarget({ id: task.id, title: task.title, isSubtask: false });
    run(() => patchTask({ status }), () => updateTaskStatusAction(task.id, status), `Moved to ${STATUS_META[status].label}`, "Status not changed. Try again.");
  };
  const changePriority = (priority: string) =>
    run(() => patchTask({ priority }), () => updateTaskPriorityAction(task.id, priority), `Priority set to ${PRIORITY_META[priority].label}`, "Priority not changed. Try again.");
  const changeDue = (v: string) =>
    run(() => patchTask({ dueDate: v ? new Date(`${v}T23:59:59`) : null }), () => setTaskDueDateAction(task.id, v || null), v ? `Due ${fmtDate(v)}` : "Due date removed", "Due date not changed. Try again.");
  const changeAssignees = (next: Person[], outside: boolean) => {
    const ownerId = task.ownerId && next.some((p) => p.id === task.ownerId) ? task.ownerId : next[0]?.id ?? null;
    run(() => patchTask({ assignees: next, ownerId }), () => setTaskAssigneesAction(task.id, next.map((p) => p.id), { outside }), null, "Assignees not changed. Try again.");
  };
  const makeOwner = (id: string) =>
    run(() => patchTask({ ownerId: id }), () => setTaskOwnerAction(task.id, id), "Owner changed", "Owner not changed. Try again.");
  const changeBlocker = (id: string | null) =>
    run(() => {}, () => setTaskBlockerAction(task.id, id), id ? "Blocker added" : "Blocker removed", "Blocker not changed. Try again.");

  const subtaskStatus = (s: SubtaskNode, status: string) => {
    if (status === "DONE") return setDoneTarget({ id: s.id, title: s.title, isSubtask: true });
    run(() => patchSubtask({ id: s.id, status }), () => updateTaskStatusAction(s.id, status), null, "Subtask status not changed. Try again.");
  };
  const subtaskAssignee = (s: SubtaskNode, person: Person, checked: boolean) => {
    const next = checked ? [...s.assignees, person] : s.assignees.filter((a) => a.id !== person.id);
    run(() => patchSubtask({ id: s.id, assignees: next }), () => setTaskAssigneesAction(s.id, next.map((a) => a.id)), null, "Assignees not changed. Try again.");
  };

  const confirmDone = (note: string) => {
    if (!doneTarget) return;
    const target = doneTarget;
    startTransition(async () => {
      if (target.isSubtask) patchSubtask({ id: target.id, status: "DONE" });
      else patchTask({ status: "DONE" });
      try {
        await updateTaskStatusAction(target.id, "DONE", undefined, note);
        toast.success(target.isSubtask ? "Subtask done" : `${key ?? "Task"} done`);
        setDoneTarget(null);
      } catch (err) {
        toast.error(errorMessage(err, "Not marked done. Try again."));
      }
    });
  };

  const cancelTask = () => startTransition(async () => {
    try {
      await cancelTaskAction(task.id, cancelReason);
      toast.success(`${key ?? "Task"} cancelled`);
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      toast.error(errorMessage(err, "Task not cancelled. Try again."));
    }
  });
  const restoreTask = () => run(() => {}, () => restoreTaskAction(task.id), `${key ?? "Task"} restored to To Do`, "Task not restored. Try again.");
  const deleteTask = () => startTransition(async () => {
    try {
      await deleteTaskAction(task.id);
      toast.success(`${key ?? "Task"} deleted`);
      router.push("/tasks");
    } catch (err) {
      toast.error(errorMessage(err, "Task not deleted. Try again."));
    }
  });
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy the link"));
  };

  const canAssign = canEditDetails && !isClosed;
  const hasMenu = canCancel || canDelete;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {task.project ? (
            canOpenProject
              ? <Link href={`/projects/${task.project.id}`} className="truncate hover:text-foreground">{task.project.name}</Link>
              : <span className="truncate">{task.project.name}</span>
          ) : (
            <Link href="/tasks?project=GENERAL" className="hover:text-foreground">General</Link>
          )}
          {task.parent && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/tasks/${task.parent.id}`} className="max-w-[220px] truncate hover:text-foreground">{task.parent.title}</Link>
            </>
          )}
          {key && (<><span aria-hidden>/</span><span className="font-mono text-xs text-foreground">{key}</span></>)}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={copyLink} aria-label="Copy link">
            <Link2 className="h-4 w-4" />
          </Button>
          {canEditDetails && (
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href={`/tasks/${task.id}/edit`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
            </Button>
          )}
          {canCancel && task.status === "CANCELLED" && (
            <Button variant="outline" size="sm" className="h-8" onClick={restoreTask} disabled={isPending}>Restore Task</Button>
          )}
          {canEditStatus && !isClosed && (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => changeStatus("DONE")}
              disabled={openSubtasks > 0 || isPending}
              title={openSubtasks > 0 ? `Finish ${openSubtasks} open subtask${openSubtasks === 1 ? "" : "s"} first` : undefined}
            >
              <Check className="h-3.5 w-3.5" /> Mark Done
            </Button>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canCancel && !isClosed && <DropdownMenuItem onClick={() => setCancelOpen(true)}>Cancel Task…</DropdownMenuItem>}
                {canDelete && (
                  <>
                    {canCancel && !isClosed && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">Delete Task…</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{task.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>
              {key && <span className="font-mono">{key}</span>}
              {key && " · "}Opened by {task.creator ? fullName(task.creator) : "someone"} {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              {" · "}Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
            </p>

            {/* Phones: the key properties right under the title (the full panel is further down). */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 lg:hidden">
              <StatusMenu status={task.status} disabled={!canEditStatus || task.status === "CANCELLED" || isPending} onChange={changeStatus} doneBlockedReason={openSubtasks > 0 ? `Finish ${openSubtasks} open subtask${openSubtasks === 1 ? "" : "s"} first` : undefined} />
              <PriorityMenu priority={task.priority} disabled={!canEditDetails || isPending} onChange={changePriority} />
              {task.dueDate && <span className="text-sm text-muted-foreground" suppressHydrationWarning>Due {fmtDate(task.dueDate)}</span>}
              {owner && (
                <span className="flex items-center gap-1.5 text-sm">
                  <UserAvatar className="h-5 w-5" user={owner} textClassName="text-[8px]" />{owner.firstName}
                </span>
              )}
            </div>

            {task.status === "DONE" && (
              <div className="mt-5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] px-4 py-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><StatusIcon status="DONE" /> Done{task.completedAt ? ` on ${fmtDate(task.completedAt)}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{task.completionNote || "Done before notes were required."}</p>
              </div>
            )}
            {task.status === "CANCELLED" && (
              <div className="mt-5 rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><StatusIcon status="CANCELLED" /> Cancelled{task.cancelledAt ? ` on ${fmtDate(task.cancelledAt)}` : ""}</p>
                <p className="mt-1 text-muted-foreground">{task.cancelReason || "No reason given."}</p>
              </div>
            )}

            <div className="mt-5 border-t border-border/60 pt-5">
              {task.description ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description.{canEditDetails && <> <Link href={`/tasks/${task.id}/edit`} className="font-medium text-foreground underline-offset-4 hover:underline">Add one</Link></>}
                </p>
              )}
            </div>
          </section>

          {/* Subtasks: one level only */}
          {!task.parentId && (
            <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
              <header className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
                <h2 className="text-sm font-semibold">Subtasks</h2>
                {counted.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    {doneCount}/{counted.length}
                    <Progress value={(doneCount / counted.length) * 100} className="h-1.5 w-20" aria-label="Subtask progress" />
                  </div>
                )}
              </header>
              {children.length === 0 ? (
                <p className="border-t border-border/60 px-5 py-6 text-center text-sm text-muted-foreground">No subtasks yet. Split the work into smaller steps.</p>
              ) : (
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {children.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-2">
                      <StatusMenu compact status={s.status} disabled={!canEditStatus || s.status === "CANCELLED"} onChange={(v) => subtaskStatus(s, v)} />
                      <Link href={`/tasks/${s.id}`} className={cn("min-w-0 flex-1 truncate text-sm hover:underline", (s.status === "DONE" || s.status === "CANCELLED") && "text-muted-foreground line-through")}>
                        {s.title}
                      </Link>
                      {s.dueDate && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline" suppressHydrationWarning>{fmtDate(s.dueDate)}</span>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!canEditDetails}>
                          <button type="button" className="flex shrink-0 items-center rounded-md p-1 hover:bg-muted" aria-label="Subtask assignees">
                            {s.assignees.length > 0 ? (
                              <span className="flex -space-x-1.5">
                                {s.assignees.slice(0, 3).map((p) => <UserAvatar key={p.id} className="h-6 w-6 ring-2 ring-card" user={p} textClassName="text-[9px]" />)}
                              </span>
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"><UserPlus className="h-3 w-3" /></span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">
                          <DropdownMenuLabel className="text-xs">Assignees</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {assignableEmployees.map((p) => (
                            <DropdownMenuCheckboxItem key={p.id} checked={s.assignees.some((a) => a.id === p.id)} onCheckedChange={(c) => subtaskAssignee(s, p, c === true)} onSelect={(e) => e.preventDefault()} className="text-sm">
                              {fullName(p)}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
              {canEditStatus && !isClosed && (
                <div className="border-t border-border/60 px-5 pb-4">
                  <NewSubtaskDialog
                    parent={{ id: task.id, title: task.title, key, priority: task.priority, dueDate: parentDue }}
                    people={assignableEmployees}
                    canAssignOthers={canEditDetails}
                    currentEmployeeId={viewer.id}
                  />
                </div>
              )}
            </section>
          )}

          <TaskComments taskId={task.id} comments={task.comments ?? []} currentEmployee={viewer} canModerate={canDelete} canComment={canEditStatus} />
        </div>

        {/* Properties */}
        <aside className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_2px_2px_rgba(0,0,0,0.04)] lg:sticky lg:top-6">
          <dl className="divide-y divide-border/60">
            <div className="pb-3">
              <Prop label="Status">
                <StatusMenu status={task.status} disabled={!canEditStatus || task.status === "CANCELLED" || isPending} onChange={changeStatus} doneBlockedReason={openSubtasks > 0 ? `Finish ${openSubtasks} open subtask${openSubtasks === 1 ? "" : "s"} first` : undefined} />
              </Prop>
              <Prop label="Priority">
                <PriorityMenu priority={task.priority} disabled={!canEditDetails || isPending} onChange={changePriority} />
              </Prop>
              <Prop label="Due date">
                {canEditDetails && !isClosed ? (
                  <DatePicker value={dateKey(task.dueDate)} min={dateKey(task.startDate) || undefined} max={dateKey(task.parent?.dueDate) || undefined} onChange={changeDue} placeholder="No due date" clearable inline aria-label="Due date" />
                ) : (
                  <span className={cn(!task.dueDate && "text-muted-foreground")}>{task.dueDate ? fmtDate(task.dueDate) : "No due date"}</span>
                )}
              </Prop>
              {task.startDate && <Prop label="Start date"><span>{fmtDate(task.startDate)}</span></Prop>}
            </div>

            <div className="py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">People</span>
                {canAssign && (
                  <AssigneePicker value={task.assignees} team={assignableEmployees} outsiders={outsideEmployees} onChange={changeAssignees} disabled={isPending}>
                    <button type="button" className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Edit</button>
                  </AssigneePicker>
                )}
              </div>
              {task.assignees.length === 0 ? (
                canAssign ? (
                  <AssigneePicker value={[]} team={assignableEmployees} outsiders={outsideEmployees} onChange={changeAssignees} disabled={isPending}>
                    <button type="button" className={ghostField}><UserPlus className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Assign someone</span></button>
                  </AssigneePicker>
                ) : <p className="text-sm text-muted-foreground">No one assigned</p>
              ) : (
                <ul className="space-y-1">
                  {[...(owner ? [owner] : []), ...helpers].map((p) => (
                    <li key={p.id} className="group flex h-9 items-center gap-2.5">
                      <UserAvatar className="h-6 w-6" user={p} textClassName="text-[9px]" />
                      <span className="min-w-0 flex-1 truncate text-sm">{fullName(p)}</span>
                      {p.id === task.ownerId ? (
                        <span className="rounded-md border border-border/70 px-1.5 py-0.5 text-[11px] font-medium">Owner</span>
                      ) : canAssign ? (
                        <button type="button" onClick={() => makeOwner(p.id)} disabled={isPending} className="rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100">
                          Make Owner
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="py-3">
              <Prop label="Project">
                {task.project ? (
                  canOpenProject
                    ? <Link href={`/projects/${task.project.id}`} className="block truncate hover:underline">{task.project.name}</Link>
                    : <span className="block truncate">{task.project.name}</span>
                ) : <span>General</span>}
              </Prop>
              {task.project?.team && (
                <Prop label="Team"><Link href={`/teams/${task.project.team.id}`} className="block truncate hover:underline">{task.project.team.name}</Link></Prop>
              )}
              <Prop label="Blocked by">
                <BlockerPicker options={projectTasks} current={task.blockedBy} disabled={!canEditDetails || isClosed} onChange={changeBlocker} />
              </Prop>
            </div>

            <div className="pt-3">
              <Prop label="Created by">
                {task.creator ? (
                  <span className="flex items-center gap-2"><UserAvatar className="h-5 w-5" user={task.creator} textClassName="text-[8px]" /><span className="truncate">{fullName(task.creator)}</span></span>
                ) : "—"}
              </Prop>
              <Prop label="Created"><span suppressHydrationWarning>{fmtDate(task.createdAt)}</span></Prop>
            </div>
          </dl>
          {!task.project && (
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              General task: seen by its creator, the people assigned, admins and anyone with task access.
            </p>
          )}
        </aside>
      </div>

      <DoneNoteDialog open={doneTarget !== null} taskTitle={doneTarget?.title} pending={isPending} onConfirm={confirmDone} onCancel={() => setDoneTarget(null)} />

      <Dialog open={cancelOpen} onOpenChange={(o) => !isPending && setCancelOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {key ?? "This Task"}?</DialogTitle>
            <DialogDescription>
              It leaves the board but stays on record and can be restored.
              {openSubtasks > 0 && ` Its ${openSubtasks} open subtask${openSubtasks === 1 ? " is" : "s are"} cancelled too.`}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); cancelTask(); }}>
            <Textarea autoFocus aria-label="Reason" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why? e.g. Client dropped this feature." disabled={isPending} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)} disabled={isPending}>Keep Task</Button>
              <Button type="submit" disabled={isPending || cancelReason.trim().length < 3}>{isPending ? "Cancelling…" : "Cancel Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !isPending && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {key ?? "this task"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {children.length > 0 ? `Its ${children.length} subtask${children.length === 1 ? " is" : "s are"} deleted too. ` : ""}This can&apos;t be undone. To keep a record, cancel it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep Task</AlertDialogCancel>
            <Button variant="destructive" onClick={deleteTask} disabled={isPending}>{isPending ? "Deleting…" : "Delete Task"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

