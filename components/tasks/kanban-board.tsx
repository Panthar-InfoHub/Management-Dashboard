"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Filter, Search, MessageSquare, ClipboardList } from "lucide-react";
import { updateTaskStatusAction } from "@/lib/actions/task.actions";

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

export function KanbanBoard({ initialTasks }: { initialTasks: any[] }) {
  const [taskList, setTaskList] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    
    // Optimistic UI Update
    setTaskList((prev) => 
      prev.map(t => t.id === taskId ? { ...t, status: statusId } : t)
    );
    
    // Server Action
    startTransition(() => {
      updateTaskStatusAction(taskId, statusId).catch(err => {
        console.error("Failed to update status", err);
      });
    });
  };

  if (taskList.length === 0) {
    return (
      <EmptyState 
        icon={ClipboardList}
        title="No tasks found"
        description="There are no tasks assigned to you or in your active projects yet."
        actionLabel="Create New Task"
        actionHref="/tasks/new"
        className="mt-6 h-[400px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks…" className="pl-9 h-9 text-sm" />
        </div>
        <Button variant="secondary" size="sm" className="gap-2 text-xs"><Filter className="h-3.5 w-3.5" /> Filter</Button>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board" className="text-xs">Board</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-6 gap-3 overflow-x-auto pb-4">
            {columns.map(col => {
              const colTasks = taskList.filter(t => t.status === col.id);
              return (
                <div 
                  key={col.id} 
                  className="min-w-[220px] flex flex-col h-full bg-muted/10 rounded-lg p-2.5 border border-border/40"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Badge variant="outline" className={cn("text-[10px]", statusColors[col.id])}>{col.title}</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
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
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start gap-1.5">
                              <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", priorityDots[task.priority])} />
                              <p className="text-xs font-medium leading-tight">{task.title}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {task.labels?.slice(0, 2).map((l: string) => (
                                <span key={l} className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-muted-foreground">{l}</span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                              <div className="flex items-center gap-1.5">
                                {assignee ? (
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback className="text-[7px] bg-primary/10">{assignee.firstName?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-dashed border-border/50 bg-accent/50" />
                                )}
                                <span className="text-[9px] text-muted-foreground">{task.storyPoints || 0}pts</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                <MessageSquare className="h-2.5 w-2.5" /> 0
                              </div>
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

        <TabsContent value="list" className="mt-4">
          <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
            <div className="divide-y divide-border/40">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span><span>Points</span>
              </div>
              {taskList.map(task => {
                const assignee = task.assignees?.[0];
                return (
                  <div 
                    key={task.id} 
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        {task.labels?.map((l: string) => <span key={l} className="text-[9px] text-muted-foreground bg-accent rounded-full px-1.5 py-0.5">{l}</span>)}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", statusColors[task.status])}>{task.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", priorityColors[task.priority])}>{task.priority}</Badge>
                    <div className="flex items-center gap-1.5">
                      {assignee && (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={assignee.avatarUrl} />
                            <AvatarFallback className="text-[7px] bg-primary/10">{assignee.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">{assignee.firstName} {assignee.lastName}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "None"}</span>
                    <span className="text-xs text-muted-foreground text-center">{task.storyPoints || "-"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
