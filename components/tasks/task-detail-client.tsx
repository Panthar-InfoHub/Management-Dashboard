"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Calendar, AlertCircle, ChevronRight, CheckCircle2, Circle, MoreHorizontal, Plus, Link as LinkIcon, ShieldAlert, UserPlus, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction, updateTaskPriorityAction, createSubtaskAction, setTaskBlockerAction, assignTaskAction } from "@/lib/actions/task.actions";
import { toast } from "sonner";

const statusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 border-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

export function TaskDetailClient({ initialTask, projectTasks }: { initialTask: any, projectTasks?: any[] }) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [isPending, startTransition] = useTransition();
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({
    title: "",
    priority: initialTask.priority,
    assigneeId: initialTask.assignees?.[0]?.id || "",
  });

  // Build a fast lookup for subtasks
  const tasksByParent = (projectTasks || []).reduce((acc: any, t: any) => {
    if (t.parentId) {
      if (!acc[t.parentId]) acc[t.parentId] = [];
      acc[t.parentId].push(t);
    }
    return acc;
  }, {});

  const toggleSubtask = (id: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = (newStatus: string) => {
    setTask((prev: any) => ({ ...prev, status: newStatus }));
    startTransition(() => {
      updateTaskStatusAction(task.id, newStatus).then((res) => {
        if(res.success) toast.success(`Status updated to ${newStatus}`);
      });
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    setTask((prev: any) => ({ ...prev, priority: newPriority }));
    startTransition(() => {
      updateTaskPriorityAction(task.id, newPriority).then((res) => {
        if(res.success) toast.success(`Priority updated to ${newPriority}`);
      });
    });
  };

  const handleBlockerChange = (blockerId: string | null) => {
    startTransition(() => {
      setTaskBlockerAction(task.id, blockerId).then((res) => {
        if(res.success) {
          toast.success(blockerId ? "Blocker added" : "Blocker removed");
          router.refresh();
        }
      });
    });
  };

  const handleCreateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if(!subtaskForm.title.trim()) return;
    startTransition(() => {
      createSubtaskAction(task.id, { 
        title: subtaskForm.title, 
        priority: subtaskForm.priority,
        assigneeId: subtaskForm.assigneeId || undefined
      }).then((res) => {
        if(res.success) {
          toast.success("Subtask created");
          setIsSubtaskDialogOpen(false);
          setSubtaskForm(prev => ({ ...prev, title: "" }));
          router.refresh(); 
        }
      });
    });
  };

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-4 md:px-8 py-3 md:py-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10 gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Link href="/tasks" className="hover:text-foreground transition-colors hidden sm:block">Tasks</Link>
          <ChevronRight className="h-3.5 w-3.5 hidden sm:block" />
          <Link href={`/projects/${task.project.id}`} className="hover:text-foreground transition-colors truncate max-w-[150px] md:max-w-[200px]">
            {task.project.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px] md:max-w-[300px]">{task.title}</span>
        </div>
        <div className="flex gap-2 self-end sm:self-auto shrink-0">
          <Button variant="outline" size="sm" className="h-8 shadow-none text-xs">
            Edit Task
          </Button>
          {task.status !== "DONE" && (
            <Button size="sm" className="h-8 shadow-none text-xs" onClick={() => handleStatusChange("DONE")}>
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
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-4 break-words">{task.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-8">
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                      Status:
                      <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1", statusColors[task.status])}>
                        {task.status.replace("_", " ")} <ChevronDown className="h-3 w-3" />
                      </Badge>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(statusColors).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="text-xs cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full mr-2", statusColors[s].split(" ")[0])} />
                        {s.replace("_", " ")}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Priority:
                      <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1", priorityColors[task.priority])}>
                        {task.priority} <ChevronDown className="h-3 w-3" />
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
                  <DropdownMenuTrigger asChild>
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

            {/* Subtasks */}
            <div className="pt-6 border-t border-border/40">
              <h3 className="text-sm font-medium mb-3 text-foreground flex items-center justify-between">
                Subtasks
                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{task.subtasks?.length || 0}</span>
              </h3>
              
              <div className="border border-border/50 rounded-lg overflow-hidden flex flex-col bg-background/50">
                {/* Recursive Subtask Renderer */}
                {(() => {
                  const renderTree = (tasks: any[], depth = 0) => {
                    return tasks.map((subtask, index) => {
                      const children = tasksByParent[subtask.id] || [];
                      const isExpanded = expandedSubtasks[subtask.id];
                      
                      return (
                        <div key={subtask.id} className="flex flex-col">
                          <div 
                            className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 pr-3 border-b border-border/40 hover:bg-muted/40 transition-colors gap-3"
                            style={{ paddingLeft: `calc(0.75rem + ${depth * 1.5}rem)` }}
                          >
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                              {children.length > 0 && (
                                <button onClick={() => toggleSubtask(subtask.id)} className="p-0.5 hover:bg-accent rounded-sm shrink-0 mr-1.5">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              )}
                              
                              <Link href={`/tasks/${subtask.id}`} className="text-sm font-medium text-foreground hover:underline truncate">
                                {subtask.title}
                              </Link>
                            </div>
                            <div className="flex items-center gap-3 pl-9 sm:pl-0 shrink-0 sm:w-[220px] justify-end">
                              <div className="w-[95px] flex justify-end">
                                <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none shrink-0">
                                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shadow-none cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-0.5", statusColors[subtask.status])}>
                                    {subtask.status.replace("_", " ")} <ChevronDown className="h-2.5 w-2.5" />
                                  </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {Object.keys(statusColors).map(s => (
                                    <DropdownMenuItem 
                                      key={s} 
                                      onClick={() => {
                                        startTransition(() => {
                                          updateTaskStatusAction(subtask.id, s).then(() => router.refresh());
                                        });
                                      }} 
                                      className="text-xs cursor-pointer"
                                    >
                                      <div className={cn("w-2 h-2 rounded-full mr-2", statusColors[s].split(" ")[0])} />
                                      {s.replace("_", " ")}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="w-[115px] flex justify-start">
                                <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none">
                                  {subtask.assignees?.[0] ? (
                                    <div className="flex items-center gap-1.5 hover:bg-muted/50 p-1 rounded-md transition-colors cursor-pointer">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={subtask.assignees[0].avatarUrl} />
                                        <AvatarFallback className="text-[8px] bg-secondary text-secondary-foreground">{subtask.assignees[0].firstName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-[11px] text-muted-foreground truncate max-w-[80px] hidden sm:block">
                                        {subtask.assignees[0].firstName}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 hover:bg-muted/50 p-1 rounded-md transition-colors cursor-pointer">
                                      <div className="h-5 w-5 rounded-full border border-dashed border-border/50 bg-accent/30 flex items-center justify-center">
                                        <UserPlus className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                      <span className="text-[11px] text-muted-foreground hidden sm:block">Assign</span>
                                    </div>
                                  )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                                  <DropdownMenuLabel className="text-xs">Assign To</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => startTransition(() => { assignTaskAction(subtask.id, null).then(() => router.refresh()) })}
                                    className="text-xs text-red-500 cursor-pointer"
                                  >
                                    Unassign
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {task.project.members.map((m: any) => (
                                    <DropdownMenuItem 
                                      key={m.employee.id} 
                                      onClick={() => startTransition(() => { assignTaskAction(subtask.id, m.employee.id).then(() => router.refresh()) })}
                                      className="text-xs cursor-pointer flex items-center gap-2"
                                    >
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage src={m.employee.avatarUrl} />
                                        <AvatarFallback className="text-[7px] bg-secondary text-secondary-foreground">{m.employee.firstName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="truncate">{m.employee.firstName} {m.employee.lastName}</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                          {isExpanded && children.length > 0 && (
                            <div className="flex flex-col w-full relative">
                              <div className="absolute top-0 bottom-0 w-px bg-border/40 z-0" style={{ left: `calc(1rem + ${depth * 1.5}rem)` }} />
                              {renderTree(children, depth + 1)}
                            </div>
                          )}
                        </div>
                      );
                    });
                  };

                  return renderTree(task.subtasks || []);
                })()}
                {(!task.subtasks || task.subtasks.length === 0) && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No subtasks yet. Add one below.
                  </div>
                )}
              </div>

                <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4 w-full justify-start text-muted-foreground border-dashed">
                      <Plus className="h-3.5 w-3.5 mr-2" /> Add a new subtask...
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Subtask</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubtask} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Title</label>
                        <Input 
                          autoFocus
                          placeholder="What needs to be done?" 
                          value={subtaskForm.title}
                          onChange={e => setSubtaskForm(prev => ({...prev, title: e.target.value}))}
                          disabled={isPending}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Priority</label>
                          <Select 
                            value={subtaskForm.priority} 
                            onValueChange={(v: any) => setSubtaskForm(prev => ({...prev, priority: v}))}
                            disabled={isPending}
                          >
                             <SelectTrigger><SelectValue/></SelectTrigger>
                             <SelectContent>
                               {Object.keys(priorityColors).map(p => (
                                 <SelectItem key={p} value={p}>{p}</SelectItem>
                               ))}
                             </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Assignee</label>
                          <Select 
                            value={subtaskForm.assigneeId} 
                            onValueChange={v => setSubtaskForm(prev => ({...prev, assigneeId: v}))}
                            disabled={isPending}
                          >
                             <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {task.project.members.map((m: any) => (
                                  <SelectItem key={m.employee.id} value={m.employee.id}>
                                    {m.employee.firstName} {m.employee.lastName}
                                  </SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsSubtaskDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!subtaskForm.title.trim() || isPending}>
                          {isPending ? "Creating..." : "Create"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

          {/* Right Sidebar (Metadata) */}
          <div className="space-y-8">
            
            {/* Assignees */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignees</h3>
              {task.assignees.length > 0 ? (
                <div className="space-y-3">
                  {task.assignees.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 group">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={a.avatarUrl} />
                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{a.firstName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground group-hover:underline cursor-pointer truncate">{a.firstName} {a.lastName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Properties</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Start Date</span>
                  <span className="font-medium" suppressHydrationWarning>{task.startDate ? new Date(task.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Due Date</span>
                  <span className="font-medium text-foreground" suppressHydrationWarning>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Project Context */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project Context</h3>
              <Link href={`/projects/${task.project.id}`} className="block group">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{task.project.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">Team: {task.project.team?.name || "None"}</p>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
