"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tasks as mockTasks, employees, projects } from "@/lib/mock-data";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "Todo" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "testing", title: "Testing" },
  { id: "done", title: "Done" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "",
    priority: "medium", 
    status: "todo",
    assignee: employees[0]?.id || "",
    project: projects[0]?.id || "",
    blockers: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    tags: ""
  });

  const handleCreateTask = () => {
    if (!newTask.title) return;
    const task = {
      id: `TASK-${Math.floor(Math.random() * 10000)}`,
      title: newTask.title,
      status: newTask.status,
      priority: newTask.priority,
      assignee: newTask.assignee,
      project: newTask.project,
      storyPoints: 1,
      dueDate: newTask.dueDate,
      labels: newTask.tags.split(",").map(t => t.trim()).filter(Boolean),
      comments: 0
    };
    
    // Mutate mock data so it persists during this dev session across pages
    mockTasks.unshift(task);
    
    router.push("/tasks");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Plus className="h-4 w-4" /></span>
              Create New Task
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/tasks">Cancel</Link>
          </Button>
          <Button onClick={handleCreateTask} className="px-8">Create Task</Button>
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
              
              <div className="space-y-2 pt-4 border-t border-border/50">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blockers & Dependencies</label>
                <Textarea 
                  value={newTask.blockers} 
                  onChange={e => setNewTask({ ...newTask, blockers: e.target.value })} 
                  placeholder="Is this task blocked by anything?" 
                  className="min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Sidebar */}
          <Card className="border-border/50 shadow-sm bg-muted/20">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Assignee</label>
                <Select value={newTask.assignee} onValueChange={v => setNewTask({ ...newTask, assignee: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Project</label>
                <Select value={newTask.project} onValueChange={v => setNewTask({ ...newTask, project: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="h-px w-full bg-border/50 my-2" />
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <Select value={newTask.status} onValueChange={v => setNewTask({ ...newTask, status: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px w-full bg-border/50 my-2" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                <Input type="date" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })} className="bg-background" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Deadline</label>
                <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="bg-background" />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground">Tags</label>
                <Input value={newTask.tags} onChange={e => setNewTask({ ...newTask, tags: e.target.value })} placeholder="e.g. frontend, bug" className="bg-background" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
