"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Plus, Filter, Search, ArrowUpRight, Calendar, DollarSign, FolderKanban } from "lucide-react";
import { updateProjectStatusAction } from "@/lib/actions/project.actions";

const healthColors: Record<string, string> = { GOOD: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20", AT_RISK: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20", CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20" };
const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20", ON_HOLD: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };

export function ProjectsClient({ initialProjects }: { initialProjects: any[] }) {
  const [projectList, setProjectList] = useState(initialProjects);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("projectId", projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("projectId");
    
    // Optimistic Update
    setProjectList((prev) => prev.map(p => p.id === projectId ? { ...p, status: statusId } : p));
    
    // Server Action
    startTransition(() => {
      updateProjectStatusAction(projectId, statusId).catch(err => {
        console.error("Failed to update status", err);
      });
    });
  };

  if (projectList.length === 0) {
    return (
      <div className="space-y-6 p-6 h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">Manage and track all active projects across your organization.</p>
          </div>
        </div>
        
        <EmptyState 
          icon={FolderKanban}
          title="No projects found"
          description="Get started by creating your first project. You can manage tasks, track progress, and collaborate with your team."
          actionLabel="Create New Project"
          actionHref="/projects/new"
          className="mt-6 h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage and track all active projects across your organization.</p>
        </div>
        <Button asChild size="sm" className="gap-2 text-xs">
          <Link href="/projects/new">
            <Plus className="h-3.5 w-3.5" /> New Project
          </Link>
        </Button>
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
            {projectList.map((project) => {
              const lead = project.lead;
              const membersList = project.members.map((m: any) => m.employee);
              return (
                <Card 
                  key={project.id} 
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="group border-border/40 shadow-none transition-all hover:bg-muted/20 cursor-pointer rounded-lg"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold leading-tight">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description || "No description"}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[project.status])}>{project.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", healthColors[project.health])}>{project.health.replace("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", priorityColors[project.priority])}>{project.priority}</Badge>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Progress</span>
                        <span className="text-[11px] font-medium">{project.computedProgress}%</span>
                      </div>
                      <Progress value={project.computedProgress} className="h-1.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No deadline"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex -space-x-1.5">
                        {membersList.slice(0, 3).map((m: any) => (
                          <Avatar key={m.id} className="h-5 w-5 border-2 border-card">
                            <AvatarImage src={m.avatarUrl} />
                            <AvatarFallback className="text-[8px] bg-primary/10">{m.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {membersList.length > 3 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px]">+{membersList.length - 3}</div>
                        )}
                        {membersList.length === 0 && (
                          <div className="text-[10px] text-muted-foreground">No members</div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{project.team?.name || "No Team"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
            <div className="divide-y divide-border/40">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                <span>Project</span><span>Status</span><span>Progress</span><span>Team</span><span>Deadline</span><span>Health</span>
              </div>
              {projectList.map((project) => {
                const lead = project.lead;
                return (
                  <div 
                    key={project.id} 
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead?.firstName} {lead?.lastName}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", statusColors[project.status])}>{project.status.replace("_", " ")}</Badge>
                    <div className="flex items-center gap-2">
                      <Progress value={project.computedProgress} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-medium">{project.computedProgress}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{project.team?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground">{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}</span>
                    <Badge variant="outline" className={cn("text-[10px] w-fit", healthColors[project.health])}>{project.health.replace("_", " ")}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {["PLANNING", "ACTIVE", "COMPLETED"].map(status => (
              <div 
                key={status}
                className="flex flex-col h-full bg-muted/10 rounded-lg p-3 border border-border/40 min-h-[400px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={cn("text-[10px]", statusColors[status])}>{status.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{projectList.filter(p => p.status === status).length}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {projectList.filter(p => p.status === status).map(project => (
                    <Card 
                      key={project.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className={cn("border-border/40 shadow-none hover:border-border transition-colors cursor-pointer active:cursor-grabbing", isPending && "opacity-80")}
                    >
                      <CardContent className="p-3">
                        <p className="text-xs font-medium mb-1">{project.name}</p>
                        <Progress value={project.computedProgress} className="h-1 mb-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{project.team?.name || "-"}</span>
                          <Badge variant="outline" className={cn("text-[9px]", healthColors[project.health])}>{project.health.replace("_", " ")}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {projectList.filter(p => p.status === status).length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground">No projects</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
