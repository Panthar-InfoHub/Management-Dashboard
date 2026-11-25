"use client";
import { errorMessage } from "@/lib/errors";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Check, ChevronsUpDown, X } from "lucide-react";
import Link from "next/link";
import { createTaskAction, updateTaskAction } from "@/lib/actions/task.actions";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

/** Project value for General tasks (no project). Must match GENERAL_FILTER. */
const GENERAL = "GENERAL";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NewTaskForm({ 
  projects, 
  employees,
  initialData,
  canAssign,
  assignableByProject = {},
  defaultProject,
}: { 
  projects: { id: string; name: string }[];
  employees: { id: string; firstName: string; lastName: string }[];
  assignableByProject?: Record<string, string[]>;
  initialData?: any;
  canAssign?: boolean;
  /** Pre-selected project, e.g. from a project's Add Task button. */
  defaultProject?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openAssignee, setOpenAssignee] = useState(false);
  
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: any;
    assigneeIds: string[];
    ownerId: string;
    project: string;
    /** "YYYY-MM-DD" or "" for none. */
    startDate: string;
    dueDate: string;
  }>({ 
    title: initialData?.title || "", 
    description: initialData?.description || "",
    priority: initialData?.priority || "MEDIUM", 
    assigneeIds: initialData?.assignees?.map((a: any) => a.id) || [],
    ownerId: initialData?.ownerId || "",
    // "GENERAL" = no project (ID GEN-n).
    project: initialData ? (initialData.projectId ?? GENERAL) : (defaultProject ?? projects[0]?.id ?? GENERAL),
    // Dates are optional: nothing is pre-filled.
    startDate: initialData?.startDate ? format(new Date(initialData.startDate), "yyyy-MM-dd") : "",
    dueDate: initialData?.dueDate ? format(new Date(initialData.dueDate), "yyyy-MM-dd") : "",
  });

  const startOfDay = (key: string) => (key ? new Date(`${key}T00:00:00`) : undefined);
  const endOfDayDate = (key: string) => (key ? new Date(`${key}T23:59:59.999`) : undefined);

  // Only people on the selected project (or its team) can be assigned. People
  // already on an existing task stay selectable so editing never drops them.
  const initialAssigneeIds: string[] = initialData?.assignees?.map((a: any) => a.id) ?? [];
  const assignableIds = new Set([
    ...(assignableByProject[newTask.project] ?? []),
    ...(newTask.project === initialData?.projectId ? initialAssigneeIds : []),
  ]);
  const assignableEmployees = employees.filter((e) => assignableIds.has(e.id));

  const changeProject = (projectId: string) => {
    setNewTask(prev => {
      const allowed = new Set([
        ...(assignableByProject[projectId] ?? []),
        ...(projectId === initialData?.projectId ? initialAssigneeIds : []),
      ]);
      const assigneeIds = prev.assigneeIds.filter(id => allowed.has(id));
      return { ...prev, project: projectId, assigneeIds, ownerId: assigneeIds.includes(prev.ownerId) ? prev.ownerId : assigneeIds[0] ?? "" };
    });
  };

  const toggleAssignee = (id: string) => {
    setNewTask(prev => {
      const current = prev.assigneeIds;
      const assigneeIds = current.includes(id) ? current.filter(a => a !== id) : [...current, id];
      // The Owner is always one of the assignees; the first one by default.
      const ownerId = assigneeIds.includes(prev.ownerId) ? prev.ownerId : assigneeIds[0] ?? "";
      return { ...prev, assigneeIds, ownerId };
    });
  };

  const removeAssignee = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleAssignee(id);
  };

  const handleCreateTask = () => {
    if (!newTask.title) {
      toast.error("Task title is required");
      return;
    }

    
    startTransition(() => {
      if (initialData) {
        updateTaskAction(initialData.id, {
          title: newTask.title,
          description: newTask.description,
          projectId: newTask.project === GENERAL ? null : newTask.project,
          assigneeIds: newTask.assigneeIds,
          ownerId: newTask.ownerId || null,
          priority: newTask.priority,
          startDate: startOfDay(newTask.startDate),
          dueDate: endOfDayDate(newTask.dueDate),
        }).then(() => {
          toast.success("Task updated");
          router.push(`/tasks/${initialData.id}`);
        }).catch((err: any) => {
          toast.error(errorMessage(err, "Failed to update task"));
        });
      } else {
        createTaskAction({
          title: newTask.title,
          description: newTask.description,
          projectId: newTask.project === GENERAL ? null : newTask.project,
          assigneeIds: newTask.assigneeIds,
          ownerId: newTask.ownerId || null,
          priority: newTask.priority,
          startDate: startOfDay(newTask.startDate),
          dueDate: endOfDayDate(newTask.dueDate),
        }).then(() => {
          toast.success("Task created");
          router.push("/tasks");
        }).catch((err: any) => {
          toast.error(errorMessage(err, "Failed to create task"));
        });
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0" disabled={isPending}>
            <Link href="/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold flex items-center gap-2 truncate">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md shrink-0"><Plus className="h-4 w-4" /></span>
              <span className="truncate">{initialData ? "Edit Task" : "Create New Task"}</span>
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto gap-3">
          <Button variant="outline" asChild disabled={isPending} className="flex-1 sm:flex-initial">
            <Link href="/tasks">Cancel</Link>
          </Button>
          <Button onClick={handleCreateTask} className="flex-1 sm:flex-initial sm:px-8" disabled={isPending}>
            {isPending ? "Saving..." : (initialData ? "Save Changes" : "Create Task")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_320px] gap-6 items-start">
          
          {/* Left Column */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title</label>
                <Input 
                  value={newTask.title} 
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })} 
                  placeholder="E.g. Update user profile schema" 
                  className="text-lg font-medium"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <Textarea 
                  value={newTask.description} 
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })} 
                  placeholder="Add more details to this task..." 
                  className="min-h-[200px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Sidebar */}
          <Card className="border-border/50 shadow-sm bg-muted/20">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Project</label>
                <Select value={newTask.project} onValueChange={changeProject}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENERAL}>General (no project)</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {newTask.project === GENERAL && (
                  <p className="text-[11px] text-muted-foreground">ID like GEN-4. Only you, the people assigned, admins and people with task access see it.</p>
                )}
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Assignees</label>
                <Popover open={openAssignee} onOpenChange={setOpenAssignee}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAssignee}
                      className={cn("w-full justify-between bg-background font-normal h-auto min-h-[40px] px-3 py-2 text-left flex items-start", canAssign === false && "opacity-70 cursor-not-allowed")}
                      disabled={isPending || canAssign === false}
                    >
                      <div className="flex flex-wrap gap-1">
                        {newTask.assigneeIds.length > 0 ? (
                          newTask.assigneeIds.map(id => {
                            const emp = employees.find(e => e.id === id);
                            return emp ? (
                              <Badge variant="secondary" key={id} className="text-[10px] rounded-sm pr-1">
                                {emp.firstName} {emp.lastName}
                                {id === newTask.ownerId && <span className="ml-1 rounded-sm bg-foreground px-1 text-[9px] text-background">Owner</span>}
                                <span 
                                  className={cn("ml-1 p-0.5 rounded-full", canAssign === false ? "opacity-50 cursor-not-allowed" : "hover:bg-muted cursor-pointer")} 
                                  onClick={(e) => {
                                    if (canAssign !== false) {
                                      removeAssignee(e, id);
                                    }
                                  }}
                                >
                                  <X className="h-2 w-2" />
                                </span>
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-muted-foreground mt-0.5">Select assignees...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 mt-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandList>
                        <CommandEmpty>No one on this project matches. Add people to the project to assign them.</CommandEmpty>
                        <CommandGroup>
                          {assignableEmployees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={`${employee.firstName} ${employee.lastName}`}
                              onSelect={() => toggleAssignee(employee.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newTask.assigneeIds.includes(employee.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {employee.firstName} {employee.lastName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {newTask.assigneeIds.length > 1 && (
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Owner</label>
                  <Select value={newTask.ownerId} onValueChange={(v) => setNewTask({ ...newTask, ownerId: v })} disabled={isPending || canAssign === false}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Choose the owner" /></SelectTrigger>
                    <SelectContent>
                      {newTask.assigneeIds.map((id) => {
                        const emp = employees.find((e) => e.id === id);
                        return emp ? <SelectItem key={id} value={id}>{emp.firstName} {emp.lastName}</SelectItem> : null;
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">The one person accountable. Everyone else helps.</p>
                </div>
              )}

              <div className="h-px w-full bg-border/50 my-2" />
              
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px w-full bg-border/50 my-2" />

              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="task-start" className="text-xs font-semibold text-muted-foreground">Start Date (optional)</label>
                <DatePicker id="task-start" value={newTask.startDate} max={newTask.dueDate || undefined} onChange={(v) => setNewTask({ ...newTask, startDate: v })} placeholder="No start date" clearable disabled={isPending} className="bg-background" />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="task-due" className="text-xs font-semibold text-muted-foreground">Due Date (optional)</label>
                <DatePicker id="task-due" value={newTask.dueDate} min={newTask.startDate || undefined} onChange={(v) => setNewTask({ ...newTask, dueDate: v })} placeholder="No due date" clearable disabled={isPending} className="bg-background" />
                <p className="text-[11px] text-muted-foreground">Only tasks with a due date can be overdue.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
