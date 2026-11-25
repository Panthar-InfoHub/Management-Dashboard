"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

import { ConfirmAction } from "@/components/ui/confirm-action";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { TaskComments } from "@/components/tasks/task-comments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, ChevronRight, Plus, Link as LinkIcon, ShieldAlert, UserPlus, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { cn, errorMessage } from "@/lib/utils";
import { updateTaskStatusAction, updateTaskPriorityAction, createSubtaskAction, setTaskBlockerAction, setTaskAssigneesAction, deleteTaskAction, cancelTaskAction, restoreTaskAction, setTaskOwnerAction } from "@/lib/actions/task.actions";
import { taskKey } from "@/lib/tasks/keys";
import { DoneNoteDialog } from "@/components/tasks/done-note-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusColors: Record<string, string> = { CANCELLED: "bg-gray-500/10 text-gray-500 border-gray-500/20 line-through", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
const STATUS_STEPS = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"];
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", TESTING: "Testing", DONE: "Done", CANCELLED: "Cancelled" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

type Person = { id: string; firstName: string; lastName: string; avatarUrl: string | null };
type SubtaskNode = { id: string; title: string; status: string; priority: string; dueDate: string | Date | null; parentId: string | null; number?: number | null; ownerId?: string | null; assignees: Person[] };

type TaskPatch = Partial<{ status: string; priority: string }>;
type SubtaskPatch = { id: string } & Partial<Pick<SubtaskNode, "status" | "assignees">>;

function formatDate(value: string | Date | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function AvatarStack({ people, size = "h-5 w-5" }: { people: Person[]; size?: string }) {
  return (
    <div className="flex -space-x-1.5">
      {people.slice(0, 3).map((p) => (
        <UserAvatar key={p.id} className={cn(size, "ring-2 ring-background")} user={p} textClassName="text-[8px]" />
      ))}
      {people.length > 3 && (
        <span className={cn(size, "rounded-full bg-muted ring-2 ring-background text-[8px] flex items-center justify-center text-muted-foreground")}>+{people.length - 3}</span>
      )}
    </div>
  );
}

export function TaskDetailClient({
  initialTask,
  projectTasks,
  subtaskTree = [],
  assignableEmployees = [],
  canEditDetails = true,
  canEditStatus = true,
  canDelete = false,
  canCancel = false,
  currentEmployeeId,
}: {
  initialTask: any;
  projectTasks?: any[];
  subtaskTree?: SubtaskNode[];
  assignableEmployees?: Person[];
  canEditDetails?: boolean;
  canEditStatus?: boolean;
  canDelete?: boolean;
  /** Owner, creator or project lead. */
  canCancel?: boolean;
  currentEmployeeId?: string;
}) {
  const router = useRouter();
  // Optimistic layers over server data: they show the change at once and fall
  // back to the server props when the action's revalidation arrives.
  const [task, patchTask] = useOptimistic(initialTask, (current: any, patch: TaskPatch) => ({ ...current, ...patch }));
  const [subtasks, patchSubtask] = useOptimistic(subtaskTree, (list: SubtaskNode[], patch: SubtaskPatch) =>
    list.map((t) => (t.id === patch.id ? { ...t, ...patch } : t))
  );

  const [isPending, startTransition] = useTransition();
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState<{ title: string; priority: string; dueDate: string; assigneeIds: string[] }>({
    title: "",
    priority: initialTask.priority,
    dueDate: "",
    assigneeIds: currentEmployeeId && assignableEmployees.some((e) => e.id === currentEmployeeId) ? [currentEmployeeId] : [],
  });

  const tasksByParent = useMemo(() => {
    const map: Record<string, SubtaskNode[]> = {};
    for (const t of subtasks) {
      if (!t.parentId) continue;
      (map[t.parentId] ??= []).push(t);
    }
    return map;
  }, [subtasks]);

  const allSubtasks = tasksByParent[task.id] ?? [];
  // Cancelled subtasks stay listed but don't count.
  const directSubtasks = allSubtasks;
  const countedSubtasks = allSubtasks.filter((t) => t.status !== "CANCELLED");
  const doneSubtasks = countedSubtasks.filter((t) => t.status === "DONE").length;
  const openSubtasks = countedSubtasks.length - doneSubtasks;
  const key = taskKey(task);
  const isClosed = task.status === "DONE" || task.status === "CANCELLED";
  const [doneTarget, setDoneTarget] = useState<{ id: string; title: string; isSubtask: boolean } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const parentDueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : undefined;
  const currentEmployee = assignableEmployees.find((e) => e.id === currentEmployeeId)
    ?? task.assignees.find((a: Person) => a.id === currentEmployeeId)
    ?? (task.creator?.id === currentEmployeeId ? task.creator : null);

  const toggleSubtask = (id: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "DONE" && task.status !== "DONE") {
      setDoneTarget({ id: task.id, title: task.title, isSubtask: false });
      return;
    }
    startTransition(async () => {
      patchTask({ status: newStatus });
      try {
        await updateTaskStatusAction(task.id, newStatus);
        toast.success(`Status changed to ${STATUS_LABELS[newStatus]}`);
      } catch (err) {
        toast.error(errorMessage(err, "Status not changed. Try again."));
      }
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    startTransition(async () => {
      patchTask({ priority: newPriority });
      try {
        await updateTaskPriorityAction(task.id, newPriority);
        toast.success(`Priority changed to ${newPriority}`);
      } catch (err) {
        toast.error(errorMessage(err, "Priority not changed. Try again."));
      }
    });
  };

  const handleBlockerChange = (blockerId: string | null) => {
    startTransition(async () => {
      try {
        await setTaskBlockerAction(task.id, blockerId);
        toast.success(blockerId ? "Blocker added" : "Blocker removed");
      } catch (err) {
        toast.error(errorMessage(err, "Blocker not changed. Try again."));
      }
    });
  };

  const handleSubtaskStatus = (subtask: SubtaskNode, status: string) => {
    if (status === "DONE" && subtask.status !== "DONE") {
      setDoneTarget({ id: subtask.id, title: subtask.title, isSubtask: true });
      return;
    }
    startTransition(async () => {
      patchSubtask({ id: subtask.id, status });
      try {
        await updateTaskStatusAction(subtask.id, status);
      } catch (err) {
        toast.error(errorMessage(err, "Subtask status not changed. Try again."));
      }
    });
  };

  const handleSubtaskAssignee = (subtask: SubtaskNode, person: Person, checked: boolean) => {
    const next = checked
      ? [...subtask.assignees, person]
      : subtask.assignees.filter((a) => a.id !== person.id);
    startTransition(async () => {
      patchSubtask({ id: subtask.id, assignees: next });
      try {
        await setTaskAssigneesAction(subtask.id, next.map((a) => a.id));
      } catch (err) {
        toast.error(errorMessage(err, "Assignees not changed. Try again."));
      }
    });
  };

  const handleCreateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskForm.title.trim()) return;
    startTransition(async () => {
      try {
        await createSubtaskAction(task.id, {
          title: subtaskForm.title,
          priority: subtaskForm.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          assigneeIds: subtaskForm.assigneeIds,
          dueDate: subtaskForm.dueDate || null,
        });
        toast.success("Subtask created");
        setIsSubtaskDialogOpen(false);
        setSubtaskForm(prev => ({ ...prev, title: "", dueDate: "", assigneeIds: !canEditDetails && currentEmployeeId ? [currentEmployeeId] : [] }));
      } catch (err) {
        toast.error(errorMessage(err, "Subtask not created. Try again."));
      }
    });
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

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelTaskAction(task.id, cancelReason);
        toast.success(`${key ?? "Task"} cancelled`);
        setCancelOpen(false);
        setCancelReason("");
      } catch (err) {
        toast.error(errorMessage(err, "Task not cancelled. Try again."));
      }
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreTaskAction(task.id);
        toast.success(`${key ?? "Task"} restored to To Do`);
      } catch (err) {
        toast.error(errorMessage(err, "Task not restored. Try again."));
      }
    });
  };

  const handleMakeOwner = (personId: string) => {
    startTransition(async () => {
      try {
        await setTaskOwnerAction(task.id, personId);
        toast.success("Owner changed");
      } catch (err) {
        toast.error(errorMessage(err, "Owner not changed. Try again."));
      }
    });
  };

  const handleDelete = async () => {
    await deleteTaskAction(task.id);
    router.push("/tasks");
    return "Task deleted";
  };

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-4 md:px-8 py-3 md:py-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10 gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Link href="/tasks" className="hover:text-foreground transition-colors hidden sm:block">Tasks</Link>
          <ChevronRight className="h-3.5 w-3.5 hidden sm:block" />
          {task.project ? (
            <Link href={`/projects/${task.project.id}`} className="hover:text-foreground transition-colors truncate max-w-[150px] md:max-w-[200px]">
              {task.project.name}
            </Link>
          ) : (
            <span>General</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          {task.parent && (
            <>
              <Link href={`/tasks/${task.parent.id}`} className="hover:text-foreground transition-colors truncate max-w-[150px]">{task.parent.title}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          {key && <span className="font-mono text-xs text-muted-foreground">{key}</span>}
          <span className="text-foreground font-medium truncate max-w-[200px] md:max-w-[300px]">{task.title}</span>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto shrink-0">
          {canEditDetails && (
            <Button variant="outline" size="sm" className="h-8 shadow-none text-xs flex-1 sm:flex-initial" asChild>
              <Link href={`/tasks/${task.id}/edit`}>Edit Task</Link>
            </Button>
          )}
            {canDelete && (
              <ConfirmAction
                trigger={<Button variant="destructive" size="sm" className="h-8 shadow-none text-xs flex-1 sm:flex-initial">Delete</Button>}
                title="Delete this task?"
                description={directSubtasks.length > 0 ? `Its ${directSubtasks.length} subtask${directSubtasks.length === 1 ? " is" : "s are"} deleted too. This can't be undone.` : "This can't be undone."}
                confirmLabel="Delete Task"
                pendingLabel="Deleting…"
                destructive
                onConfirm={handleDelete}
              />
            )}
          {canCancel && task.status !== "CANCELLED" && task.status !== "DONE" && (
            <Dialog open={cancelOpen} onOpenChange={(o) => { if (!isPending) setCancelOpen(o); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 shadow-none text-xs flex-1 sm:flex-initial">Cancel Task</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Cancel This Task?</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleCancel(); }}>
                  <p className="text-xs text-muted-foreground">It leaves the board but stays on record, and can be restored. {openSubtasks > 0 ? `Its ${openSubtasks} open subtask${openSubtasks === 1 ? " is" : "s are"} cancelled too.` : ""}</p>
                  <Textarea autoFocus aria-label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why? e.g. Client dropped this feature." disabled={isPending} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>Keep Task</Button>
                    <Button type="submit" disabled={isPending || cancelReason.trim().length < 3}>{isPending ? "Cancelling…" : "Cancel Task"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {canCancel && task.status === "CANCELLED" && (
            <Button size="sm" variant="outline" className="h-8 shadow-none text-xs flex-1 sm:flex-initial" onClick={handleRestore} disabled={isPending}>
              {isPending ? "Restoring…" : "Restore Task"}
            </Button>
          )}
          {canEditStatus && !isClosed && (
            <Button
              size="sm"
              className="h-8 shadow-none text-xs flex-1 sm:flex-initial"
              onClick={() => handleStatusChange("DONE")}
              disabled={openSubtasks > 0}
              title={openSubtasks > 0 ? `Finish ${openSubtasks} open subtask${openSubtasks === 1 ? "" : "s"} first` : undefined}
            >
              Mark as Done
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-8 md:gap-12 items-start">
          
          {/* Main Content Area */}
          <div className="space-y-8 min-w-0">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-4 break-words">
                {key && <span className="mr-2 font-mono text-base font-normal text-muted-foreground">{key}</span>}
                {task.title}
              </h1>
              {task.status === "CANCELLED" && (
                <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Cancelled{task.cancelledAt ? ` on ${formatDate(task.cancelledAt)}` : ""}</p>
                  <p className="text-muted-foreground">{task.cancelReason || "No reason given."}</p>
                </div>
              )}
              {task.status === "DONE" && (
                <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Done{task.completedAt ? ` on ${formatDate(task.completedAt)}` : ""}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{task.completionNote || "Done before notes were required."}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-8">
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none" disabled={!canEditStatus || task.status === "CANCELLED"}>
                    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground mr-4", (!canEditStatus || task.status === "CANCELLED") && "opacity-70 cursor-not-allowed")}>
                      Status:
                      <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1", statusColors[task.status])}>
                        {STATUS_LABELS[task.status] ?? task.status} {canEditStatus && <ChevronDown className="h-3 w-3" />}
                      </Badge>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_STEPS.map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="text-xs cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full mr-2", statusColors[s].split(" ")[0])} />
                        {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none" disabled={!canEditDetails}>
                    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", !canEditDetails && "opacity-70 cursor-not-allowed")}>
                      Priority:
                      <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1", priorityColors[task.priority])}>
                        {task.priority} {canEditDetails && <ChevronDown className="h-3 w-3" />}
                      </Badge>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-xs">Change Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(priorityColors).map(p => (
                      <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)} className="text-xs cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full mr-2", priorityColors[p].split(" ")[0])} />
                        {p}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {task.blockedBy && (
                  <Badge variant="outline" className="text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none border-amber-500/20 text-amber-600 bg-amber-500/10 flex items-center gap-1 cursor-default">
                    <ShieldAlert className="h-3 w-3" /> Blocked
                  </Badge>
                )}
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed break-words">
                {task.description ? (
                  <p className="whitespace-pre-wrap text-[14px] md:text-[15px]">{task.description}</p>
                ) : (
                  <p className="italic">No description provided.</p>
                )}
              </div>
            </div>

            {/* Blockers & Dependencies */}
            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Blocked By
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={!canEditDetails}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                      <LinkIcon className="h-3 w-3 mr-1" /> {task.blockedBy ? "Change Blocker" : "Add Blocker"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Select Task</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {task.blockedBy && (
                      <>
                        <DropdownMenuItem onClick={() => handleBlockerChange(null)} className="text-xs text-red-500 cursor-pointer font-medium">
                          Remove Blocker
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {projectTasks?.map(t => (
                      <DropdownMenuItem key={t.id} onClick={() => handleBlockerChange(t.id)} className="text-xs cursor-pointer flex flex-col items-start gap-1">
                        <span className="font-medium truncate w-full">{t.title}</span>
                        <span className="text-[9px] text-muted-foreground">{t.status}</span>
                      </DropdownMenuItem>
                    ))}
                    {projectTasks?.length === 0 && <DropdownMenuItem disabled className="text-xs">No other tasks in project</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {task.blockedBy && (
                <Link href={`/tasks/${task.blockedBy.id}`}>
                  <div className="bg-muted/20 border border-border/40 hover:border-border transition-colors rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{task.blockedBy.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground"></span> Blocker Task
                      </span>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] shadow-none whitespace-nowrap", statusColors[task.blockedBy.status])}>
                      {task.blockedBy.status}
                    </Badge>
                  </div>
                </Link>
              )}
            </div>

            {/* Subtasks: one level only, so a subtask has none of its own */}
            {!task.parentId && (
            <div className="pt-6 border-t border-border/40">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-foreground">Subtasks</h3>
                {countedSubtasks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{doneSubtasks} of {countedSubtasks.length} done</span>
                    <Progress value={(doneSubtasks / countedSubtasks.length) * 100} className="h-1.5 w-20" aria-label="Subtask progress" />
                  </div>
                )}
              </div>

              <div className="border border-border/50 rounded-lg overflow-hidden flex flex-col bg-background/50">
                {directSubtasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No subtasks yet. Add one to split this task into smaller steps.
                  </div>
                ) : (
                  <SubtaskRows
                    nodes={directSubtasks}
                    depth={0}
                    tasksByParent={tasksByParent}
                    expanded={expandedSubtasks}
                    onToggle={toggleSubtask}
                    canEditStatus={canEditStatus}
                    canEditDetails={canEditDetails}
                    assignableEmployees={assignableEmployees}
                    onStatus={handleSubtaskStatus}
                    onAssignee={handleSubtaskAssignee}
                  />
                )}
              </div>

              {canEditStatus && !isClosed && (
                <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4 w-full justify-start text-muted-foreground border-dashed">
                      <Plus className="h-3.5 w-3.5 mr-2" /> Add Subtask
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Subtask</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubtask} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label htmlFor="subtask-title" className="text-xs font-medium">Title</label>
                        <Input
                          id="subtask-title"
                          autoFocus
                          placeholder="What needs to be done?"
                          value={subtaskForm.title}
                          onChange={e => setSubtaskForm(prev => ({ ...prev, title: e.target.value }))}
                          disabled={isPending}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Priority</label>
                          <Select
                            value={subtaskForm.priority}
                            onValueChange={(v) => setSubtaskForm(prev => ({ ...prev, priority: v }))}
                            disabled={isPending}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.keys(priorityColors).map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="subtask-due" className="text-xs font-medium">Due Date</label>
                          <DatePicker
                            id="subtask-due"
                            value={subtaskForm.dueDate}
                            max={parentDueDate || undefined}
                            onChange={(v) => setSubtaskForm(prev => ({ ...prev, dueDate: v }))}
                            disabled={isPending}
                            placeholder="No due date"
                            clearable
                          />
                          {parentDueDate && <p className="text-[11px] text-muted-foreground">Parent is due {formatDate(task.dueDate)}.</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-medium">Assignees</span>
                        {assignableEmployees.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No one is on this project yet. Add members to the project first.</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto rounded-md border border-border/50 divide-y divide-border/40">
                            {assignableEmployees
                              .filter(e => canEditDetails || e.id === currentEmployeeId)
                              .map(e => {
                                const checked = subtaskForm.assigneeIds.includes(e.id);
                                return (
                                  <label key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                                    <Checkbox
                                      checked={checked}
                                      disabled={isPending}
                                      onCheckedChange={() => setSubtaskForm(prev => ({
                                        ...prev,
                                        assigneeIds: checked ? prev.assigneeIds.filter(id => id !== e.id) : [...prev.assigneeIds, e.id],
                                      }))}
                                    />
                                    <span className="truncate">{e.firstName} {e.lastName}</span>
                                  </label>
                                );
                              })}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">Only members of this project or its team can be assigned.</p>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsSubtaskDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!subtaskForm.title.trim() || isPending}>
                          {isPending ? "Creating…" : "Create Subtask"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            )}

            <TaskComments
              taskId={task.id}
              comments={task.comments ?? []}
              currentEmployee={currentEmployee}
              canModerate={canDelete}
              canComment={canEditStatus}
            />
          </div>

          {/* Right Sidebar (Metadata) */}
          <div className="space-y-8">
            
            {/* Assignees */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignees</h3>
              {task.assignees.length > 0 ? (
                <div className="space-y-3">
                  {[...task.assignees].sort((a: Person, b: Person) => (a.id === task.ownerId ? -1 : b.id === task.ownerId ? 1 : 0)).map((a: Person) => (
                    <div key={a.id} className="flex items-center gap-3 group">
                      <UserAvatar className="h-7 w-7" user={a} textClassName="text-[10px]" />
                      <span className="text-sm font-medium text-foreground truncate">{a.firstName} {a.lastName}</span>
                      {a.id === task.ownerId ? (
                        <Badge variant="outline" className="ml-auto text-[10px] shadow-none">Owner</Badge>
                      ) : canEditDetails && !isClosed ? (
                        <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => handleMakeOwner(a.id)} disabled={isPending}>
                          Make Owner
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">The Owner is accountable; everyone else helps.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No owner yet</p>
              )}
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Properties</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Start Date</span>
                  <span className="font-medium" suppressHydrationWarning>{task.startDate ? formatDate(task.startDate) : "Not set"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Due Date</span>
                  <span className="font-medium text-foreground" suppressHydrationWarning>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                </div>
              </div>
            </div>

            {/* Project Context */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project</h3>
              {task.project ? (
                <Link href={`/projects/${task.project.id}`} className="block group">
                  <div className="p-3 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{task.project.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">Team: {task.project.team?.name || "None"}</p>
                  </div>
                </Link>
              ) : (
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10">
                  <p className="text-sm font-medium text-foreground">General</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Not in a project. Seen by its creator, the people assigned, admins and people with task access.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <DoneNoteDialog
        open={doneTarget !== null}
        taskTitle={doneTarget?.title}
        pending={isPending}
        onConfirm={confirmDone}
        onCancel={() => setDoneTarget(null)}
      />
    </div>
  );
}

function SubtaskRows({
  nodes,
  depth,
  tasksByParent,
  expanded,
  onToggle,
  canEditStatus,
  canEditDetails,
  assignableEmployees,
  onStatus,
  onAssignee,
}: {
  nodes: SubtaskNode[];
  depth: number;
  tasksByParent: Record<string, SubtaskNode[]>;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  canEditStatus: boolean;
  canEditDetails: boolean;
  assignableEmployees: Person[];
  onStatus: (subtask: SubtaskNode, status: string) => void;
  onAssignee: (subtask: SubtaskNode, person: Person, checked: boolean) => void;
}) {
  return (
    <>
      {nodes.map((subtask) => {
        const children = tasksByParent[subtask.id] ?? [];
        const isExpanded = expanded[subtask.id];
        const childrenDone = children.filter((c) => c.status === "DONE").length;
        return (
          <div key={subtask.id} className="flex flex-col">
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 pr-3 border-b border-border/40 hover:bg-muted/40 transition-colors gap-3"
              style={{ paddingLeft: `calc(0.75rem + ${depth * 1.5}rem)` }}
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onToggle(subtask.id)}
                    className="p-0.5 hover:bg-accent rounded-sm shrink-0"
                    aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                    aria-expanded={!!isExpanded}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                )}
                <Link href={`/tasks/${subtask.id}`} className={cn("text-sm font-medium hover:underline truncate", subtask.status === "DONE" || subtask.status === "CANCELLED" ? "text-muted-foreground line-through" : "text-foreground")}>
                  {subtask.title}
                </Link>
                {children.length > 0 && (
                  <span className="text-[11px] text-muted-foreground shrink-0">{childrenDone}/{children.length}</span>
                )}
              </div>
              <div className="flex items-center gap-3 pl-9 sm:pl-0 shrink-0 justify-end">
                {subtask.dueDate && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                    <Clock className="h-3 w-3" /> {formatDate(subtask.dueDate)}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none shrink-0" disabled={!canEditStatus}>
                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-0.5", statusColors[subtask.status], !canEditStatus && "opacity-70 cursor-not-allowed")}>
                      {STATUS_LABELS[subtask.status] ?? subtask.status} {canEditStatus && <ChevronDown className="h-2.5 w-2.5" />}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_STEPS.map(s => (
                      <DropdownMenuItem key={s} onClick={() => onStatus(subtask, s)} className="text-xs cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full mr-2", statusColors[s].split(" ")[0])} />
                        {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none" disabled={!canEditDetails} aria-label="Change assignees">
                    <div className={cn("flex items-center gap-1.5 hover:bg-muted/50 p-1 rounded-md transition-colors", canEditDetails ? "cursor-pointer" : "opacity-70 cursor-not-allowed")}>
                      {subtask.assignees.length > 0 ? (
                        <>
                          <AvatarStack people={[...subtask.assignees].sort((a, b) => (a.id === subtask.ownerId ? -1 : b.id === subtask.ownerId ? 1 : 0))} />
                          {subtask.assignees.length === 1 && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[80px] hidden sm:block">{subtask.assignees[0].firstName}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="h-5 w-5 rounded-full border border-dashed border-border/50 bg-accent/30 flex items-center justify-center">
                            <UserPlus className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span className="text-[11px] text-muted-foreground hidden sm:block">Assign</span>
                        </>
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Assignees</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {assignableEmployees.length === 0 && (
                      <DropdownMenuItem disabled className="text-xs">No project members yet</DropdownMenuItem>
                    )}
                    {assignableEmployees.map((person) => (
                      <DropdownMenuCheckboxItem
                        key={person.id}
                        checked={subtask.assignees.some((a) => a.id === person.id)}
                        onCheckedChange={(checked) => onAssignee(subtask, person, checked === true)}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                      >
                        {person.firstName} {person.lastName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {isExpanded && children.length > 0 && (
              <div className="flex flex-col w-full relative">
                <div className="absolute top-0 bottom-0 w-px bg-border/40 z-0" style={{ left: `calc(1rem + ${depth * 1.5}rem)` }} />
                <SubtaskRows
                  nodes={children}
                  depth={depth + 1}
                  tasksByParent={tasksByParent}
                  expanded={expanded}
                  onToggle={onToggle}
                  canEditStatus={canEditStatus}
                  canEditDetails={canEditDetails}
                  assignableEmployees={assignableEmployees}
                  onStatus={onStatus}
                  onAssignee={onAssignee}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
