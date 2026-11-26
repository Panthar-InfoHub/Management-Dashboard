"use client";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { errorMessage } from "@/lib/errors";

import { ConfirmAction } from "@/components/ui/confirm-action";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadPicker, MembersDialog, type Person } from "@/components/teams/team-dialogs";
import type { ProjectDetail, ProjectMemberRow, ProjectTaskRow } from "@/lib/queries/project.queries";

const titleCase = (v: string) => v.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProjectAction, manageProjectMembersAction, updateProjectStatusAction, updateProjectPriorityAction, deleteProjectAction } from "@/lib/actions/project.actions";

import { MemberPermissionsDialog } from "./member-permissions-dialog";

const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 border-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 border-purple-500/20", PAUSED: "bg-orange-500/10 text-orange-600 border-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const taskStatusColors: Record<string, string> = { CANCELLED: "bg-gray-500/10 text-gray-500 border-gray-500/20 line-through", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };

const toKey = (d: string | Date | null | undefined) => (d ? format(new Date(d), "yyyy-MM-dd") : "");

export function ProjectDetailClient({ project, allEmployees = [], allTeams = [], canEdit = true, canDelete = false, canDelegate = false, openEdit = false }: { project: ProjectDetail, allEmployees: Person[], allTeams: { id: string; name: string }[], canEdit?: boolean, canDelete?: boolean, canDelegate?: boolean, openEdit?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const completedTasks = project.tasks.filter((t: ProjectTaskRow) => t.status === "DONE").length;
  const totalTasks = project.tasks.length;
  
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const tasksByParent = project.tasks.reduce((acc: Record<string, ProjectTaskRow[]>, t: ProjectTaskRow) => {
    if (t.parentId) {
      if (!acc[t.parentId]) acc[t.parentId] = [];
      acc[t.parentId].push(t);
    }
    return acc;
  }, {});

  const topLevelTasks = project.tasks.filter((t: ProjectTaskRow) => !t.parentId);
  
  // Edit Project State
  // Read the clock once, not on every render.
  const [now] = useState(() => Date.now());
  // ?edit=1 (from the projects list) opens Edit Project straight away.
  const [editOpen, setEditOpen] = useState(() => canEdit && openEdit);
  const [editData, setEditData] = useState({ 
    name: project.name, 
    description: project.description || "", 
    leadId: project.leadId,
    teamId: project.teamId,
    status: project.status,
    priority: project.priority,
    key: project.key ?? "",
    startDate: toKey(project.startDate),
    endDate: toKey(project.endDate),
  });

  const handleOpenEdit = () => {
    setEditData({ 
      name: project.name, 
      description: project.description || "", 
      leadId: project.leadId,
      teamId: project.teamId,
      status: project.status,
      priority: project.priority,
      key: project.key ?? "",
      startDate: toKey(project.startDate),
      endDate: toKey(project.endDate),
    });
    setEditOpen(true);
  };

  const handleUpdateProject = () => {
    if (!editData.name || !editData.leadId || !editData.teamId) return;
    startTransition(() => {
      updateProjectAction(project.id, { ...editData, startDate: editData.startDate || null, endDate: editData.endDate || null }).then(() => {
        toast.success(`${editData.name} saved`);
        setEditOpen(false);
      }).catch((err) => toast.error(errorMessage(err, "Failed to update project")));
    });
  };

  // Permission Delegation State
  const [permOpen, setPermOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberRow | null>(null);

  const handleOpenPermissions = (member: ProjectMemberRow) => {
    setSelectedMember(member);
    setPermOpen(true);
  };

  const [manageOpen, setManageOpen] = useState(false);
  const handleOpenManage = () => setManageOpen(true);

  const handleQuickStatusChange = (newStatus: string) => {
    if (newStatus === project.status) return;
    startTransition(() => {
      updateProjectStatusAction(project.id, newStatus).catch((err) => toast.error(errorMessage(err, "Failed to update status")));
    });
  };

  const handleQuickPriorityChange = (newPriority: string) => {
    if (newPriority === project.priority) return;
    startTransition(() => {
      updateProjectPriorityAction(project.id, newPriority).catch((err) => toast.error(errorMessage(err, "Failed to update priority")));
    });
  };

  const handleDeleteProject = async () => {
    await deleteProjectAction(project.id);
    router.push("/projects");
    return `Project ${project.name} deleted`;
  };

  const openTasks = project.tasks.filter((t: ProjectTaskRow) => !["DONE", "CANCELLED"].includes(t.status));
  const overdueTasks = openTasks.filter((t: ProjectTaskRow) => t.dueDate && new Date(t.dueDate).getTime() < now).length;
  const daysLeft = project.endDate ? Math.ceil((new Date(project.endDate).getTime() - now) / 86400000) : null;
  const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const TASK_LABEL: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", TESTING: "Testing", DONE: "Done", CANCELLED: "Cancelled" };
  const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PLANNING: "Planning", PAUSED: "Paused", COMPLETED: "Completed", ARCHIVED: "Archived" };
  const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {/* Header (not sticky: it scrolls away with the page) */}
        <div className="space-y-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground">Projects</Link>
            <ChevronRight className="h-3 w-3" />
            {project.team && <><Link href={`/teams/${project.team.id}`} className="hover:text-foreground">{project.team.name}</Link><ChevronRight className="h-3 w-3" /></>}
            <span className="text-foreground">{project.name}</span>
          </nav>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.key && <span className="mr-2 font-mono text-base font-normal text-muted-foreground">{project.key}</span>}
                {project.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger disabled={!canEdit} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default">
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusColors[project.status]?.split(" ")[0])} />
                    {STATUS_LABEL[project.status] ?? project.status} {canEdit && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {Object.keys(statusColors).map((st) => <DropdownMenuItem key={st} onClick={() => handleQuickStatusChange(st)} className="text-xs">{STATUS_LABEL[st] ?? st}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger disabled={!canEdit} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default">
                    {PRIORITY_LABEL[project.priority]} priority {canEdit && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {Object.keys(priorityColors).map((pr) => <DropdownMenuItem key={pr} onClick={() => handleQuickPriorityChange(pr)} className="text-xs">{PRIORITY_LABEL[pr]}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {canEdit && <Button variant="outline" size="sm" onClick={handleOpenManage}>Members</Button>}
              {canEdit && <Button variant="outline" size="sm" onClick={handleOpenEdit}>Edit Project</Button>}
              <Button size="sm" asChild className="gap-1.5"><Link href={`/tasks/new?project=${project.id}`}><Plus className="h-3.5 w-3.5" /> Add Task</Link></Button>
              {canDelete && (
                <ConfirmAction
                  trigger={<Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400">Delete</Button>}
                  title={`Delete project ${project.name}?`}
                  description="All of its tasks are deleted too. This can't be undone."
                  confirmLabel="Delete Project"
                  pendingLabel="Deleting…"
                  destructive
                  onConfirm={handleDeleteProject}
                />
              )}
            </div>
          </div>
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs font-medium text-muted-foreground">Progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{project.computedProgress}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/75" style={{ width: `${project.computedProgress}%` }} /></div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs font-medium text-muted-foreground">Open Tasks</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{openTasks.length}</p>
            <p className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} done</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs font-medium text-muted-foreground">Overdue</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", overdueTasks > 0 && "text-red-600 dark:text-red-400")}>{overdueTasks}</p>
            <p className="text-xs text-muted-foreground">{overdueTasks ? "past their due date" : "nothing late"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs font-medium text-muted-foreground">Deadline</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", daysLeft !== null && daysLeft < 0 && openTasks.length > 0 && !["COMPLETED", "ARCHIVED"].includes(project.status) && "text-red-600 dark:text-red-400")}>
              {daysLeft === null ? "—" : openTasks.length === 0 && totalTasks > 0 ? "Done" : daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d left`}
            </p>
            <p className="text-xs text-muted-foreground">{project.endDate ? fmt(project.endDate) : canEdit ? "None yet · add one in Edit Project" : "No deadline"}</p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-5">
              <h2 className="mb-2 text-sm font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{project.description || <span className="text-muted-foreground">No description yet.</span>}</p>
            </section>

            <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
              <header className="flex items-center justify-between px-5 pt-4 pb-3">
                <h2 className="text-sm font-semibold">Tasks <span className="font-normal text-muted-foreground">· {topLevelTasks.length}</span></h2>
                <Link href={`/tasks?project=${project.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">Open board →</Link>
              </header>
              {project.tasks.length > 0 ? (
                <ul className="max-h-[560px] divide-y divide-border/60 overflow-y-auto border-t border-border/60">
                  {topLevelTasks.map((task: ProjectTaskRow) => {
                    const children = tasksByParent[task.id] || [];
                    const expanded = expandedTasks[task.id];
                    const owner = task.owner ?? task.assignees?.[0];
                    const late = task.dueDate && !["DONE", "CANCELLED"].includes(task.status) && new Date(task.dueDate).getTime() < now;
                    const row = (t: ProjectTaskRow, sub = false) => (
                      <div className={cn("flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40", sub && "pl-12")} onMouseEnter={() => router.prefetch(`/tasks/${t.id}`)}>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", taskStatusColors[t.status]?.split(" ")[0])} title={TASK_LABEL[t.status]} />
                        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{project.key && t.number ? `${project.key}-${t.number}` : ""}</span>
                        <Link href={`/tasks/${t.id}`} className={cn("min-w-0 flex-1 truncate text-sm hover:underline", ["DONE", "CANCELLED"].includes(t.status) && "text-muted-foreground line-through")}>{t.title}</Link>
                        <span className="hidden w-24 text-xs text-muted-foreground sm:block">{TASK_LABEL[t.status]}</span>
                        <span className={cn("hidden w-16 text-right text-xs tabular-nums sm:block", late ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </span>
                        {(t.owner ?? t.assignees?.[0]) ? <UserAvatar className="h-6 w-6 shrink-0" user={t.owner ?? t.assignees[0]} textClassName="text-[9px]" /> : <span className="h-6 w-6 shrink-0" />}
                      </div>
                    );
                    void owner;
                    return (
                      <li key={task.id}>
                        <div className="flex items-center">
                          {children.length > 0 ? (
                            <button type="button" onClick={(e) => toggleTask(task.id, e)} aria-expanded={!!expanded} aria-label={expanded ? "Hide subtasks" : "Show subtasks"} className="ml-2 flex h-6 shrink-0 items-center gap-0.5 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted">
                              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{children.length}
                            </button>
                          ) : <span className="ml-2 w-8 shrink-0" />}
                          <div className="min-w-0 flex-1">{row(task)}</div>
                        </div>
                        {expanded && children.map((c: ProjectTaskRow) => <div key={c.id} className="border-t border-border/40 bg-muted/20">{row(c, true)}</div>)}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="border-t border-border/60 px-5 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3"><Link href={`/tasks/new?project=${project.id}`}>Add the First Task</Link></Button>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-5">
              <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Lead</dt>
                  <dd className="flex items-center gap-2 font-medium"><UserAvatar className="h-5 w-5" user={project.lead} textClassName="text-[8px]" />{project.lead.firstName} {project.lead.lastName}</dd>
                </div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Team</dt><dd className="font-medium">{project.team ? <Link href={`/teams/${project.team.id}`} className="hover:underline">{project.team.name}</Link> : "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Start</dt><dd className="font-medium">{project.startDate ? fmt(project.startDate) : "Not set"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Deadline</dt><dd className="font-medium">{project.endDate ? fmt(project.endDate) : "No deadline"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Task IDs</dt><dd className="font-mono font-medium">{project.key ? `${project.key}-n` : "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd className="font-medium">{fmt(project.createdAt)}</dd></div>
              </dl>
            </section>

            <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
              <header className="flex items-center justify-between px-5 pt-4 pb-3">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Members · {project.members.length}</h2>
                {canEdit && <button type="button" onClick={handleOpenManage} className="text-xs font-medium text-muted-foreground hover:text-foreground">Manage</button>}
              </header>
              {project.members.length > 0 ? (
                <ul className="max-h-[320px] divide-y divide-border/60 overflow-y-auto border-t border-border/60">
                  {project.members.map((m: ProjectMemberRow) => (
                    <li key={m.id} className="group flex items-center gap-3 px-5 py-2.5">
                      <UserAvatar className="h-7 w-7" user={m.employee} textClassName="text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.employee.firstName} {m.employee.lastName}</span>
                        {m.employeeId === project.leadId && <span className="text-[11px] font-medium">Lead</span>}
                      </span>
                      {canDelegate && m.employeeId !== project.leadId && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => handleOpenPermissions(m)}>
                          Access
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-border/60 px-5 py-6 text-center text-sm text-muted-foreground">No members yet.</p>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Dialog open={editOpen} onOpenChange={(v) => !isPending && setEditOpen(v)}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Details, ownership and timeline.</DialogDescription>
          </DialogHeader>
          <form
            id="edit-project"
            className="flex-1 space-y-6 overflow-y-auto px-6 py-5"
            onSubmit={(e) => { e.preventDefault(); handleUpdateProject(); }}
          >
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-name">Project Name</Label>
                  <Input id="edit-project-name" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} maxLength={120} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-key">Task Key</Label>
                  <Input id="edit-project-key" className="font-mono uppercase" value={editData.key} onChange={e => setEditData({ ...editData, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} disabled={isPending} />
                </div>
              </div>
              {editData.key !== (project.key ?? "") && (
                <p className="-mt-2 text-xs text-amber-700 dark:text-amber-400">Every task ID in this project changes to {editData.key || "…"}-number.</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="edit-project-desc" rows={3} value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} placeholder="What this project delivers" disabled={isPending} />
              </div>
            </section>

            <section className="space-y-4 border-t border-border/60 pt-5">
              <h3 className="text-xs font-medium text-muted-foreground">Ownership</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Project Lead</Label>
                  <LeadPicker value={editData.leadId} people={allEmployees} onChange={(v) => setEditData({ ...editData, leadId: v })} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label>Owning Team</Label>
                  <Select value={editData.teamId} onValueChange={val => setEditData({ ...editData, teamId: val })} disabled={isPending}>
                    <SelectTrigger className="h-[52px] w-full"><SelectValue placeholder="Choose a team" /></SelectTrigger>
                    <SelectContent>
                      {allTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-border/60 pt-5">
              <h3 className="text-xs font-medium text-muted-foreground">Status & Timeline</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editData.status} onValueChange={val => setEditData({ ...editData, status: val as typeof editData.status })} disabled={isPending}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusColors).map(st => <SelectItem key={st} value={st}>{titleCase(st)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editData.priority} onValueChange={val => setEditData({ ...editData, priority: val as typeof editData.priority })} disabled={isPending}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(priorityColors).map(pr => <SelectItem key={pr} value={pr}>{titleCase(pr)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-start">Start Date</Label>
                  <DatePicker id="edit-project-start" value={editData.startDate} max={editData.endDate || undefined} onChange={(v) => setEditData({ ...editData, startDate: v })} placeholder="Not set" clearable />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-end">Deadline</Label>
                  <DatePicker id="edit-project-end" value={editData.endDate} min={editData.startDate || undefined} onChange={(v) => setEditData({ ...editData, endDate: v })} placeholder="No deadline" clearable />
                </div>
              </div>
            </section>
          </form>
          <DialogFooter className="m-0 rounded-b-xl border-t border-border/60 px-6 py-3">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" form="edit-project" disabled={isPending || !editData.name.trim() || !editData.leadId || !editData.teamId}>
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {manageOpen && (
        <MembersDialog
          open
          onOpenChange={setManageOpen}
          title="Manage Members"
          description={`Who works on ${project.name}. Only members can be assigned its tasks. The lead always stays.`}
          people={allEmployees}
          members={project.members.map((m: { employee: Person }) => m.employee)}
          leadId={project.leadId}
          onSave={async (ids) => {
            await manageProjectMembersAction(project.id, ids);
            return `${project.name} members updated`;
          }}
        />
      )}

      {/* Member Permissions Dialog */}
      <MemberPermissionsDialog 
        open={permOpen}
        onOpenChange={setPermOpen}
        projectId={project.id}
        member={selectedMember}
        delegatedPerms={project.delegatedPerms || []}
      />
    </div>
  );
}
