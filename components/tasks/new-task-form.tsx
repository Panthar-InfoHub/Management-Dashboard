"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FormField, FormSection } from "@/components/ui/form-section";
import { createTaskAction, updateTaskAction } from "@/lib/actions/task.actions";
import { errorMessage } from "@/lib/errors";
import { taskKey } from "@/lib/tasks/keys";
import { cn } from "@/lib/utils";

/** Project value for General tasks (no project). Must match GENERAL_FILTER. */
const GENERAL = "GENERAL";
const PRIORITIES = [
  { id: "LOW", label: "Low", dot: "bg-neutral-400" },
  { id: "MEDIUM", label: "Medium", dot: "bg-neutral-500" },
  { id: "HIGH", label: "High", dot: "bg-orange-500" },
  { id: "CRITICAL", label: "Critical", dot: "bg-red-500" },
] as const;
type Priority = (typeof PRIORITIES)[number]["id"];
type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };

/** The fields of an existing task the form edits. */
type EditableTask = {
  id: string; title: string; description: string | null; priority: string; projectId: string | null; ownerId: string | null;
  startDate: Date | string | null; dueDate: Date | string | null; assignees: Person[];
};

export function NewTaskForm({
  projects,
  employees,
  initialData,
  canAssign,
  assignableByProject = {},
  outsideAllowed = {},
  defaultProject,
}: {
  projects: { id: string; name: string }[];
  employees: Person[];
  assignableByProject?: Record<string, string[]>;
  /** Per project (and "GENERAL"): may this person assign people from outside it? */
  outsideAllowed?: Record<string, boolean>;
  /** The task being edited (edit page). */
  initialData?: EditableTask;
  canAssign?: boolean;
  /** Pre-selected project, e.g. from a project's Add Task button. */
  defaultProject?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialAssigneeIds: string[] = initialData?.assignees?.map((a: Person) => a.id) ?? [];

  const [form, setForm] = useState({
    title: (initialData?.title as string) ?? "",
    description: (initialData?.description as string) ?? "",
    priority: ((initialData?.priority as Priority) ?? "MEDIUM") as Priority,
    assigneeIds: initialAssigneeIds,
    ownerId: (initialData?.ownerId as string) ?? "",
    project: initialData ? (initialData.projectId ?? GENERAL) : (defaultProject ?? (projects.length ? projects[0].id : GENERAL)),
    // Dates are optional: nothing is pre-filled.
    startDate: initialData?.startDate ? format(new Date(initialData.startDate), "yyyy-MM-dd") : "",
    dueDate: initialData?.dueDate ? format(new Date(initialData.dueDate), "yyyy-MM-dd") : "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const isGeneral = form.project === GENERAL;
  const lastProject = !isGeneral ? form.project : projects[0]?.id;

  // Only people on the chosen project (or its team) can be assigned. People
  // already on the task stay selectable, so editing never drops them.
  const allowedFor = (project: string) => new Set([
    ...(assignableByProject[project] ?? []),
    ...((initialData?.projectId ?? GENERAL) === project ? initialAssigneeIds : []),
  ]);
  const allowed = allowedFor(form.project);
  const mayGoOutside = !!outsideAllowed[form.project];
  // Editing a task that already has outside people starts with the switch on.
  const [outsideOn, setOutsideOn] = useState(() => initialAssigneeIds.some((id) => !allowed.has(id)));
  const outside = mayGoOutside && outsideOn;
  const assignable = outside ? employees : employees.filter((e) => allowed.has(e.id));
  const byId = new Map(employees.map((e) => [e.id, e]));

  const changeProject = (project: string) => {
    if (outsideAllowed[project] && outsideOn) return set({ project });
    const ok = allowedFor(project);
    const assigneeIds = form.assigneeIds.filter((id) => ok.has(id));
    set({ project, assigneeIds, ownerId: assigneeIds.includes(form.ownerId) ? form.ownerId : assigneeIds[0] ?? "" });
  };

  const toggleAssignee = (id: string) => {
    const assigneeIds = form.assigneeIds.includes(id) ? form.assigneeIds.filter((a) => a !== id) : [...form.assigneeIds, id];
    // The Owner is always one of the assignees; the first one by default.
    set({ assigneeIds, ownerId: assigneeIds.includes(form.ownerId) ? form.ownerId : assigneeIds[0] ?? "" });
  };

  const submit = () => {
    if (!form.title.trim()) return toast.error("Add a title");
    const payload = {
      title: form.title,
      description: form.description,
      projectId: isGeneral ? null : form.project,
      assigneeIds: form.assigneeIds,
      ownerId: form.ownerId || null,
      priority: form.priority,
      startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`) : undefined,
      dueDate: form.dueDate ? new Date(`${form.dueDate}T23:59:59.999`) : undefined,
      outside: form.assigneeIds.some((id) => !allowed.has(id)),
    };
    startTransition(async () => {
      try {
        if (initialData) {
          await updateTaskAction(initialData.id, payload);
          toast.success("Task saved");
          router.push(`/tasks/${initialData.id}`);
        } else {
          const res = await createTaskAction(payload);
          toast.success("Task created");
          router.push(`/tasks/${res.taskId}`);
        }
      } catch (err) {
        toast.error(errorMessage(err, initialData ? "Task not saved. Try again." : "Task not created. Try again."));
      }
    });
  };

  const backHref = initialData ? `/tasks/${initialData.id}` : "/tasks";
  const key = initialData ? taskKey(initialData) : null;

  return (
    <form
      className="mx-auto w-full max-w-4xl px-6 py-6"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
    >
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
            <Link href={backHref}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{initialData ? "Edit Task" : "New Task"}</h1>
            <p className="text-xs text-muted-foreground">{key ? <span className="font-mono">{key}</span> : "Only a title is required."}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" disabled={isPending}><Link href={backHref}>Cancel</Link></Button>
          <Button type="submit" disabled={isPending || !form.title.trim()} title="⌘/Ctrl + Enter">
            {isPending ? "Saving…" : initialData ? "Save Task" : "Create Task"}
          </Button>
        </div>
      </div>

      <FormSection title="Task" description="What needs to happen.">
        <FormField label="Title" htmlFor="task-title">
          <Input id="task-title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Build the leave report export" className="h-10 text-base" autoFocus disabled={isPending} />
        </FormField>
        <FormField label="Description" htmlFor="task-desc">
          <Textarea id="task-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Details, links, acceptance criteria…" className="min-h-32" disabled={isPending} />
        </FormField>
      </FormSection>

      <FormSection title="Where" description="A project, or General for work that isn't part of one.">
        <div role="radiogroup" aria-label="Where" className="grid grid-cols-2 gap-2 sm:max-w-md">
          {([
            { id: "project", label: "In a Project", sub: projects.length ? `${projects.length} available` : "None you can add to", disabled: projects.length === 0 },
            { id: "general", label: "General", sub: "ID like GEN-4", disabled: false },
          ] as const).map((o) => {
            const active = o.id === "general" ? isGeneral : !isGeneral;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={o.disabled || isPending}
                onClick={() => changeProject(o.id === "general" ? GENERAL : lastProject ?? GENERAL)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/30"
                )}
              >
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-[11px] text-muted-foreground">{o.sub}</span>
              </button>
            );
          })}
        </div>
        {isGeneral ? (
          <p className="text-xs text-muted-foreground">Seen only by you, the people assigned, admins and people with task access.</p>
        ) : (
          <FormField label="Project">
            <Select value={form.project} onValueChange={changeProject} disabled={isPending}>
              <SelectTrigger className="h-9 w-full sm:max-w-md"><SelectValue placeholder="Choose a project" /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        )}
      </FormSection>

      <FormSection title="People" description="Everyone working on it. One of them owns it.">
        <FormField label="Assignees" hint={assignable.length === 0 ? (isGeneral ? "You can assign yourself and people in teams you lead." : "No one is on this project yet. Add members to the project first.") : undefined}>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" role="combobox" aria-expanded={pickerOpen} disabled={isPending || canAssign === false} className="h-auto min-h-9 w-full justify-between px-2.5 py-1.5 font-normal">
                <span className="flex flex-wrap gap-1">
                  {form.assigneeIds.length === 0 && <span className="py-0.5 text-muted-foreground">Add people…</span>}
                  {form.assigneeIds.map((id) => {
                    const p = byId.get(id);
                    if (!p) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 py-0.5 pr-1 pl-0.5 text-xs">
                        <UserAvatar className="h-4 w-4" user={p} textClassName="text-[7px]" />
                        {p.firstName} {p.lastName}
                        {id === form.ownerId && <span className="rounded bg-foreground px-1 text-[9px] font-medium text-background">Owner</span>}
                        <span role="button" tabIndex={-1} aria-label={`Remove ${p.firstName}`} className="rounded p-0.5 hover:bg-muted" onClick={(e) => { e.stopPropagation(); toggleAssignee(id); }}>
                          <X className="h-3 w-3" />
                        </span>
                      </span>
                    );
                  })}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search people…" />
                <CommandList className="overscroll-contain">
                  <CommandEmpty>No one here matches.</CommandEmpty>
                  <CommandGroup>
                    {assignable.map((p) => (
                      <CommandItem key={p.id} value={`${p.firstName} ${p.lastName}`} onSelect={() => toggleAssignee(p.id)}>
                        <Check className={cn("mr-1 h-4 w-4", form.assigneeIds.includes(p.id) ? "opacity-100" : "opacity-0")} />
                        <UserAvatar className="h-5 w-5" user={p} textClassName="text-[8px]" />
                        {p.firstName} {p.lastName}
                        {!allowed.has(p.id) && <span className="ml-auto text-[11px] text-muted-foreground">Outside</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {mayGoOutside && (
            <label className="mt-2 flex items-start gap-2.5 text-sm">
              <Switch
                checked={outsideOn}
                onCheckedChange={(on) => {
                  setOutsideOn(on);
                  // Turning it off drops people who aren't on the project.
                  if (!on) {
                    const assigneeIds = form.assigneeIds.filter((id) => allowed.has(id));
                    set({ assigneeIds, ownerId: assigneeIds.includes(form.ownerId) ? form.ownerId : assigneeIds[0] ?? "" });
                  }
                }}
                disabled={isPending}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Include people outside {isGeneral ? "your teams" : "this project"}</span>
                <span className="block text-xs text-muted-foreground">They can see and work on this task without joining the project.</span>
              </span>
            </label>
          )}
        </FormField>
        {form.assigneeIds.length > 1 && (
          <FormField label="Owner" hint="The one person accountable for it.">
            <Select value={form.ownerId} onValueChange={(v) => set({ ownerId: v })} disabled={isPending || canAssign === false}>
              <SelectTrigger className="h-9 w-full sm:max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {form.assigneeIds.map((id) => byId.get(id)).filter(Boolean).map((p) => <SelectItem key={p!.id} value={p!.id}>{p!.firstName} {p!.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </FormSection>

      <FormSection title="Planning" description="All optional. Only tasks with a due date can be overdue.">
        <FormField label="Priority">
          <div role="radiogroup" aria-label="Priority" className="inline-flex rounded-lg border border-border p-0.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={form.priority === p.id}
                onClick={() => set({ priority: p.id })}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  form.priority === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />{p.label}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
          <FormField label="Start Date" htmlFor="task-start">
            <DatePicker id="task-start" value={form.startDate} max={form.dueDate || undefined} onChange={(v) => set({ startDate: v })} placeholder="Not set" clearable disabled={isPending} />
          </FormField>
          <FormField label="Due Date" htmlFor="task-due">
            <DatePicker id="task-due" value={form.dueDate} min={form.startDate || undefined} onChange={(v) => set({ dueDate: v })} placeholder="No due date" clearable disabled={isPending} />
          </FormField>
        </div>
      </FormSection>
    </form>
  );
}
