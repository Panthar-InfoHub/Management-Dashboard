"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Calendar, AlertCircle, FileText, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 border-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

export function TaskDetailClient({ initialTask }: { initialTask: any }) {
  const [task] = useState(initialTask);

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/tasks" className="hover:text-foreground transition-colors">Tasks</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/projects/${task.project.id}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
            {task.project.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[300px]">{task.title}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="h-8 shadow-none">
            Edit Task
          </Button>
          <Button size="sm" className="h-8 shadow-none" variant={task.status === "DONE" ? "secondary" : "default"}>
            {task.status === "DONE" ? "Reopen Task" : "Mark as Done"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-12 items-start">
          
          {/* Main Content Area (Clean typography, no boxes) */}
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-4">{task.title}</h1>
              <div className="flex items-center gap-2 mb-8">
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none", statusColors[task.status])}>
                  {task.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none", priorityColors[task.priority])}>
                  {task.priority} Priority
                </Badge>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                {task.description ? (
                  <p className="whitespace-pre-wrap text-[15px]">{task.description}</p>
                ) : (
                  <p className="italic">No description provided.</p>
                )}
              </div>
            </div>

            {task.blockers && (
              <div className="pt-6 border-t border-border/40">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-foreground">
                  <AlertCircle className="h-4 w-4 text-red-500" /> Blockers & Dependencies
                </h3>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
                  <p className="whitespace-pre-wrap">{task.blockers}</p>
                </div>
              </div>
            )}

            {/* Activity / Comments Stream */}
            <div className="pt-8 border-t border-border/40">
              <h3 className="text-sm font-medium mb-6 text-foreground">Activity</h3>
              <div className="space-y-6">
                {/* Creation Log */}
                <div className="flex gap-4">
                  <div className="relative mt-1">
                    <div className="absolute top-8 bottom-[-24px] left-1/2 w-px bg-border/50 -translate-x-1/2" />
                    <Avatar className="h-7 w-7 ring-4 ring-background">
                      <AvatarImage src={task.creator.avatarUrl} />
                      <AvatarFallback className="text-[9px] bg-primary/5">{task.creator.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{task.creator.firstName} {task.creator.lastName}</span> created this task
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(task.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Example of empty state for comments since we don't have a comment form yet */}
                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center ring-4 ring-background">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="pt-1 text-sm text-muted-foreground italic">
                    No further activity.
                  </div>
                </div>
              </div>
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
                      <span className="text-sm font-medium text-foreground group-hover:underline cursor-pointer">{a.firstName} {a.lastName}</span>
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
                  <span className="font-medium">{task.startDate ? new Date(task.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Due Date</span>
                  <span className="font-medium text-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Story Points</span>
                  <span className="font-medium bg-muted px-2 py-0.5 rounded text-xs">{task.storyPoints || "—"}</span>
                </div>
              </div>
            </div>

            {/* Project Context */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project</h3>
              <Link href={`/projects/${task.project.id}`} className="block group">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{task.project.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Owning Team: {task.project.team?.name || "None"}</p>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
