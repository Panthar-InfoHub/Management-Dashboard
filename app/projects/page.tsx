"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projects, employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Plus, Filter, Search, FolderKanban, ArrowUpRight, Calendar, Users, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";

const healthColors: Record<string, string> = { good: "bg-green-500/10 text-green-600 dark:text-green-400", "at-risk": "bg-amber-500/10 text-amber-600 dark:text-amber-400", critical: "bg-red-500/10 text-red-600 dark:text-red-400" };
const statusColors: Record<string, string> = { active: "bg-blue-500/10 text-blue-600 dark:text-blue-400", delayed: "bg-red-500/10 text-red-600 dark:text-red-400", completed: "bg-green-500/10 text-green-600 dark:text-green-400" };
const priorityColors: Record<string, string> = { critical: "bg-red-500/10 text-red-500", high: "bg-orange-500/10 text-orange-500", medium: "bg-blue-500/10 text-blue-500", low: "bg-gray-500/10 text-gray-500" };

export default function ProjectsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage and track all active projects across your organization.</p>
        </div>
        <Button size="sm" className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> New Project</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects…" className="pl-9 h-9 text-sm" />
        </div>
        <Button variant="secondary" size="sm" className="gap-2 text-xs"><Filter className="h-3.5 w-3.5" /> Filter</Button>
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid" className="text-xs">Grid</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
          <TabsTrigger value="board" className="text-xs">Board</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const lead = employees.find(e => e.id === project.lead);
              const membersList = project.members.map(m => employees.find(e => e.id === m)).filter(Boolean);
              return (
                <Card key={project.id} className="group border-border/50 transition-all hover:border-border hover:shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold leading-tight">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] border-0", statusColors[project.status])}>{project.status}</Badge>
                      <Badge className={cn("text-[10px] border-0", healthColors[project.health])}>{project.health}</Badge>
                      <Badge className={cn("text-[10px] border-0", priorityColors[project.priority])}>{project.priority}</Badge>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Progress</span>
                        <span className="text-[11px] font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>${(project.spent / 1000).toFixed(0)}k / ${(project.budget / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex -space-x-1.5">
                        {membersList.slice(0, 3).map((m) => (
                          <Avatar key={m!.id} className="h-5 w-5 border-2 border-card">
                            <AvatarFallback className="text-[8px] bg-primary/10">{m!.avatar}</AvatarFallback>
                          </Avatar>
                        ))}
                        {membersList.length > 3 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px]">+{membersList.length - 3}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{project.team}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card className="border-border/50">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Project</span><span>Status</span><span>Progress</span><span>Team</span><span>Deadline</span><span>Health</span>
              </div>
              {projects.map((project) => {
                const lead = employees.find(e => e.id === project.lead);
                return (
                  <div key={project.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-xs font-medium">{project.name}</p>
                      <p className="text-[11px] text-muted-foreground">{lead?.name}</p>
                    </div>
                    <Badge className={cn("text-[10px] w-fit border-0", statusColors[project.status])}>{project.status}</Badge>
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-medium">{project.progress}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{project.team}</span>
                    <span className="text-xs text-muted-foreground">{new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <Badge className={cn("text-[10px] w-fit border-0", healthColors[project.health])}>{project.health}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {["active", "delayed", "completed"].map(status => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={cn("text-[10px] border-0", statusColors[status])}>{status}</Badge>
                  <span className="text-xs text-muted-foreground">{projects.filter(p => p.status === status).length}</span>
                </div>
                <div className="space-y-2">
                  {projects.filter(p => p.status === status).map(project => (
                    <Card key={project.id} className="border-border/50 hover:border-border transition-colors">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium mb-1">{project.name}</p>
                        <Progress value={project.progress} className="h-1 mb-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{project.team}</span>
                          <Badge className={cn("text-[9px] border-0", healthColors[project.health])}>{project.health}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
