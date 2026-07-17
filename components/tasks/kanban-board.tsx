"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Filter, Search, MessageSquare, ClipboardList, Clock, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { updateTaskStatusAction, loadMoreTasksAction } from "@/lib/actions/task.actions";
import { toast } from "sonner";

const statusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };
const priorityDots: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-blue-500", LOW: "bg-gray-500" };

const columns = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "Todo" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "REVIEW", title: "Review" },
  { id: "TESTING", title: "Testing" },
  { id: "DONE", title: "Done" },
];

export function KanbanBoard({ 
  initialTasks, 
  allowedProjects = [], 
  allowedTeams = [], 
  allEmployees = [],
  currentEmployeeId,
  employeeRole
}: { 
  initialTasks: any[], 
  allowedProjects?: any[], 
  allowedTeams?: any[], 
  allEmployees?: any[],
  currentEmployeeId: string,
  employeeRole: string
}) {
  const [taskList, setTaskList] = useState(initialTasks);
  // Remove local search state, we will use URL search params
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [hasMore, setHasMore] = useState(initialTasks.length === 50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTaskList(initialTasks);
    setHasMore(initialTasks.length === 50);
  }, [initialTasks]);

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const urlTeam = searchParams.get("team") || "ALL";
  const urlProject = searchParams.get("project") || "ALL";
  const urlAssignee = searchParams.get("assignee") || "ALL";

  // We start with the explicitly allowed lists from the server (to prevent losing filters when searching),
  // but we ALSO inject any projects/teams/assignees that appear in the current tasks.
  // This ensures that if you are assigned to a task in a project you don't belong to, 
  // you can still filter by that project.
  const teams = useMemo(() => {
    const map = new Map(allowedTeams.map(t => [t.id, t]));
    initialTasks.forEach(t => {
      if (t.project?.team) map.set(t.project.team.id, t.project.team);
    });
    return Array.from(map.values());
  }, [allowedTeams, initialTasks]);

  const projects = useMemo(() => {
    const map = new Map(allowedProjects.map(p => [p.id, p]));
    initialTasks.forEach(t => {
      if (t.project) map.set(t.project.id, t.project);
    });
    return Array.from(map.values());
  }, [allowedProjects, initialTasks]);

  const assignees = useMemo(() => {
    const map = new Map(allEmployees.map(e => [e.id, e]));
    initialTasks.forEach(t => {
      t.assignees?.forEach((a: any) => map.set(a.id, a));
    });
    return Array.from(map.values());
  }, [allEmployees, initialTasks]);

  // Search from URL
  const urlSearch = searchParams.get("search") || "";

  // The backend already filters `taskList`, but we keep this for optimistic UI rendering 
  // (e.g. when dragging a task, or when waiting for server component to reload)
  const filteredTasks = taskList.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(urlSearch.toLowerCase()) || 
                        (t.project?.name || "").toLowerCase().includes(urlSearch.toLowerCase());
    const matchTeam = urlTeam === "ALL" || t.project?.team?.id === urlTeam;
    const matchProject = urlProject === "ALL" || t.project?.id === urlProject;
    const matchAssignee = urlAssignee === "ALL" || 
                          (urlAssignee === "UNASSIGNED" ? (!t.assignees || t.assignees.length === 0) : (t.assignees && t.assignees.some((a: any) => a.id === urlAssignee)));
    
    return matchSearch && matchTeam && matchProject && matchAssignee;
  });

  const updateUrlFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = taskList.find(t => t.id === taskId);
    if (!task) return;
    const oldStatus = task.status;
    
    // Optimistic UI Update
    setTaskList((prev) => 
      prev.map(t => t.id === taskId ? { ...t, status: statusId } : t)
    );
    
    // Server Action
    startTransition(() => {
      updateTaskStatusAction(taskId, statusId).then(() => {
        toast.success("Task status updated");
      }).catch((err: any) => {
        setTaskList((prev) => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
        toast.error(err.message || "Failed to update status");
        console.error("Failed to update status", err);
      });
    });
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const skip = taskList.length;
    try {
      const more = await loadMoreTasksAction({
        team: searchParams.get("team") || "ALL",
        project: searchParams.get("project") || "ALL",
        assignee: searchParams.get("assignee") || "ALL",
        search: searchParams.get("search") || "",
      }, skip);
      if (more.length < 50) setHasMore(false);
      setTaskList(prev => [...prev, ...more]);
    } catch(err) {
      toast.error("Failed to load more tasks");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasActiveFilters = urlTeam !== "ALL" || urlProject !== "ALL" || urlAssignee !== "ALL" || urlSearch !== "";

  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 flex-wrap">
        <div className="relative flex-1 w-full min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search tasks…" 
            defaultValue={urlSearch}
            onChange={(e) => {
              const val = e.target.value;
              const timeoutId = window.setTimeout(() => {
                updateUrlFilter("search", val || "ALL");
              }, 500);
              return () => clearTimeout(timeoutId);
            }}
            className="pl-9 h-9 text-sm" 
          />
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border/50 bg-background shrink-0">
            <Switch 
              id="my-tasks" 
              checked={urlAssignee === currentEmployeeId} 
              onCheckedChange={(checked) => updateUrlFilter("assignee", checked ? currentEmployeeId : "ALL")}
            />
            <Label htmlFor="my-tasks" className="text-xs font-medium cursor-pointer">My Tasks</Label>
          </div>

          <Select value={urlTeam} onValueChange={(v) => updateUrlFilter("team", v)}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /> <SelectValue placeholder="Team" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Teams</SelectItem>
              {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={urlProject} onValueChange={(v) => updateUrlFilter("project", v)}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /> <SelectValue placeholder="Project" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={urlAssignee} onValueChange={(v) => updateUrlFilter("assignee", v)}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /> <SelectValue placeholder="Assignee" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assignees</SelectItem>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {assignees.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title={hasActiveFilters ? "No tasks match your filters" : "No tasks found"}
          description={hasActiveFilters ? "Try adjusting your search or filters to see more tasks." : "There are no tasks assigned to you or in your active projects yet."}
          {...(!hasActiveFilters ? { actionLabel: "Create New Task", actionHref: "/tasks/new" } : {
            actionLabel: "Clear Filters",
            onAction: () => router.push("/tasks")
          })}
          className="mt-6 h-[400px]"
        />
      ) : (
        <Tabs defaultValue="board" className="flex-1 flex flex-col min-w-0">
          <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="board" className="text-xs">Board</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-0 pt-4 flex-1 focus-visible:outline-none">
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {columns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.id);
              return (
                <div 
                  key={col.id} 
                  className="flex flex-col bg-muted/10 rounded-lg p-2.5 border border-border/40 min-h-[100px] min-w-[280px] max-w-[280px] snap-center shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[col.id])}>{col.title}</Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 pr-1 pb-4">
                    {colTasks.map(task => {
                      const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
                      const extraAssignees = task.assignees ? task.assignees.length - 1 : 0;
                      return (
                        <Card 
                          key={task.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className={cn("border-border/40 shadow-none hover:border-border transition-all hover:bg-muted/20 cursor-grab active:cursor-grabbing rounded-md", isPending && "opacity-80")}
                        >
                          <CardContent className="p-2.5 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                {task.project?.name && (
                                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                                    {task.project.team?.name ? `${task.project.team.name} › ` : ""}{task.project.name}
                                  </span>
                                )}
                                <p className="text-xs font-semibold leading-tight text-foreground">{task.title}</p>
                              </div>
                              <Avatar className="h-5 w-5 shrink-0 ring-1 ring-border/50">
                                {assignee ? (
                                  <>
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback className="text-[8px] bg-primary/10">{assignee.firstName?.charAt(0)}</AvatarFallback>
                                  </>
                                ) : (
                                  <AvatarFallback className="text-[8px] bg-muted text-muted-foreground border-dashed">?</AvatarFallback>
                                )}
                              </Avatar>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1.5">
                                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDots[task.priority] || "bg-muted")} title={`Priority: ${task.priority}`} />
                                {task.dueDate && (
                                  <span className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                              
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex gap-1 shrink-0">
                                  {task.labels.slice(0, 1).map((l: string) => (
                                    <span key={l} className="rounded text-[8px] font-medium bg-accent text-muted-foreground px-1 py-0.5 max-w-[60px] truncate">{l}</span>
                                  ))}
                                  {task.labels.length > 1 && <span className="rounded text-[8px] font-medium bg-accent text-muted-foreground px-1 py-0.5">+{task.labels.length - 1}</span>}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {colTasks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
                        <p className="text-[11px] text-muted-foreground">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0 pt-4 flex-1 overflow-y-auto focus-visible:outline-none">
          <div className="border border-border/40 rounded-lg overflow-x-auto bg-background">
            <div className="divide-y divide-border/40 min-w-[1000px]">
              <div className="grid grid-cols-[minmax(250px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(120px,1fr)] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span>
              </div>
              {filteredTasks.map(task => {
                const assignee = task.assignees?.[0];

                return (
                  <div 
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="grid grid-cols-[minmax(250px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(120px,1fr)] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <div className="flex gap-1 mt-0.5">
                          {task.labels?.map((l: string) => <span key={l} className="text-[9px] text-muted-foreground bg-accent rounded-full px-1.5 py-0.5">{l}</span>)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", statusColors[task.status])}>{task.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", priorityColors[task.priority])}>{task.priority}</Badge>
                    <div className="flex items-center gap-1.5">
                      {assignee && (
                        <>
                          <Avatar className="h-4 w-4 shrink-0">
                            <AvatarImage src={assignee.avatarUrl} />
                            <AvatarFallback className="text-[7px] bg-primary/10">{assignee.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">{assignee.firstName} {assignee.lastName}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "None"}</span>
                  </div>
                );
              })}
            </div>
             </div>
          </TabsContent>
        </Tabs>
      )}

      {hasMore && filteredTasks.length > 0 && (
        <div className="flex justify-center mt-2 shrink-0 pb-4">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "Load More Tasks"}
          </Button>
        </div>
      )}
    </div>
  );
}
