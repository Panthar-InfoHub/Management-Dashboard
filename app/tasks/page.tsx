"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { tasks as mockTasks, employees, projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Plus, Filter, Search, MessageSquare } from "lucide-react";

const statusColors: Record<string, string> = { backlog: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20", todo: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20", "in-progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", review: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20", testing: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20", done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" };
const priorityColors: Record<string, string> = { critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20", high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", low: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };
const priorityDots: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-blue-500", low: "bg-gray-500" };

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "Todo" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "testing", title: "Testing" },
  { id: "done", title: "Done" },
];

export default function TasksPage() {
  const [taskList, setTaskList] = useState(mockTasks);

  // Sync with mockTasks to pick up newly added tasks across pages
  useEffect(() => {
    setTaskList([...mockTasks]);
  }, []);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const updated = taskList.map(t => t.id === taskId ? { ...t, status: statusId } : t);
    setTaskList(updated);
    
    // Also mutate mock data so changes persist across navigation during this session
    const mockTask = mockTasks.find(t => t.id === taskId);
    if (mockTask) {
      mockTask.status = statusId;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and manage all tasks across projects.</p>
        </div>
        <Button asChild size="sm" className="gap-2 text-xs">
          <Link href="/tasks/new">
            <Plus className="h-3.5 w-3.5" /> New Task
          </Link>
        </Button>
      </div>

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
          <div className="grid grid-cols-6 gap-3 overflow-x-auto">
            {columns.map(col => {
              const colTasks = taskList.filter(t => t.status === col.id);
              return (
                <div 
                  key={col.id} 
                  className="min-w-[200px] flex flex-col h-full bg-accent/20 rounded-md p-2 border border-border/20"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Badge variant="outline" className={cn("text-[10px]", statusColors[col.id])}>{col.title}</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {colTasks.map(task => {
                      const assignee = employees.find(e => e.id === task.assignee);
                      return (
                        <Card 
                          key={task.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="border-border/50 hover:border-border transition-all hover:shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start gap-1.5">
                              <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", priorityDots[task.priority])} />
                              <p className="text-xs font-medium leading-tight">{task.title}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {task.labels.slice(0, 2).map(l => (
                                <span key={l} className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-muted-foreground">{l}</span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[7px] bg-primary/10">{assignee?.avatar}</AvatarFallback>
                                </Avatar>
                                <span className="text-[9px] text-muted-foreground">{task.storyPoints}pts</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                <MessageSquare className="h-2.5 w-2.5" /> {task.comments}
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
          <Card className="border-border/50">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span><span>Points</span>
              </div>
              {taskList.map(task => {
                const assignee = employees.find(e => e.id === task.assignee);
                return (
                  <div key={task.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center hover:bg-accent/30 transition-colors cursor-pointer">
                    <div>
                      <p className="text-xs font-medium">{task.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        {task.labels.map(l => <span key={l} className="text-[9px] text-muted-foreground bg-accent rounded-full px-1.5 py-0.5">{l}</span>)}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", statusColors[task.status])}>{task.status}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", priorityColors[task.priority])}>{task.priority}</Badge>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10">{assignee?.avatar}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground truncate">{assignee?.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span className="text-xs text-muted-foreground text-center">{task.storyPoints}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
