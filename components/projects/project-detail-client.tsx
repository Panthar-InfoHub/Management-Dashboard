"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, CheckSquare, Clock, ChevronRight, Plus, Users, Flag, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const healthColors: Record<string, string> = { GOOD: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", AT_RISK: "bg-amber-500/10 text-amber-600 border-amber-500/20", CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20" };
const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 border-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 border-purple-500/20", PAUSED: "bg-orange-500/10 text-orange-600 border-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const taskStatusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 border-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };

export function ProjectDetailClient({ initialProject }: { initialProject: any }) {
  const [project] = useState(initialProject);

  const completedTasks = project.tasks.filter((t: any) => t.status === "DONE").length;
  const totalTasks = project.tasks.length;
  
  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[300px]">{project.name}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild className="h-8 shadow-none">
            <Link href={`/projects/${project.id}/edit`}>
              Edit Project
            </Link>
          </Button>
          <Button size="sm" asChild className="h-8 shadow-none gap-1.5">
            <Link href={`/tasks/new?project=${project.id}`}>
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_300px] gap-12 items-start">
          
          {/* Main Content Area */}
          <div className="space-y-10">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">{project.name}</h1>
              <div className="flex items-center gap-2 mb-8">
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none", statusColors[project.status])}>
                  {project.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none", healthColors[project.health])}>
                  Health: {project.health.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none", priorityColors[project.priority])}>
                  {project.priority} Priority
                </Badge>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                {project.description ? (
                  <p className="whitespace-pre-wrap text-[15px]">{project.description}</p>
                ) : (
                  <p className="italic">No description provided.</p>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="pt-8 border-t border-border/40">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-4 text-foreground">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Overall Progress
              </h3>
              <div className="bg-muted/20 border border-border/40 rounded-xl p-5">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-bold tracking-tight">{project.computedProgress}%</span>
                    <p className="text-xs text-muted-foreground mt-1">{completedTasks} of {totalTasks} tasks completed</p>
                  </div>
                </div>
                <Progress value={project.computedProgress} className="h-2 bg-muted-foreground/10" />
              </div>
            </div>

            {/* Tasks Section */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" /> Project Tasks
                </h3>
                <Link href="/tasks" className="text-xs text-primary hover:underline">View All on Board</Link>
              </div>

              {project.tasks.length > 0 ? (
                <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
                  <div className="divide-y divide-border/40">
                    {project.tasks.map((task: any) => (
                      <div key={task.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group">
                        <div className="space-y-1.5">
                          <Link href={`/tasks/${task.id}`} className="text-sm font-medium group-hover:text-primary transition-colors block">
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shadow-none rounded-sm", taskStatusColors[task.status])}>
                              {task.status.replace("_", " ")}
                            </Badge>
                            {task.dueDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {task.assignees?.map((a: any) => (
                            <Avatar key={a.id} className="h-7 w-7 border-2 border-background">
                              <AvatarImage src={a.avatarUrl} />
                              <AvatarFallback className="text-[9px] bg-primary/10">{a.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center bg-muted/10">
                  <p className="text-sm text-muted-foreground">No tasks have been created for this project yet.</p>
                  <Button variant="link" asChild className="mt-2 text-primary h-auto p-0">
                    <Link href={`/tasks/new?project=${project.id}`}>Create the first task</Link>
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar (Metadata) */}
          <div className="space-y-8">
            
            {/* Leadership */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Leadership</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Project Lead</span>
                  <div className="flex items-center gap-3 bg-muted/20 border border-border/40 rounded-lg p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={project.lead.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-xs">{project.lead.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">{project.lead.firstName} {project.lead.lastName}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Owning Team</span>
                  <div className="flex items-center gap-3 bg-muted/20 border border-border/40 rounded-lg p-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">{project.team?.name || "No Team"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Properties</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Start Date</span>
                  <span className="font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Flag className="h-3.5 w-3.5" /> Target End Date</span>
                  <span className="font-medium text-foreground">{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Project Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{project.members.length}</span>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {project.members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 group">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.employee.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {m.employee.firstName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.employee.firstName} {m.employee.lastName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
