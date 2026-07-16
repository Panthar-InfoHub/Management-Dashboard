"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { tasks, projects, employees, dailyUpdates } from "@/lib/mock-data";
import { Target, AlertCircle, Users, ArrowUpRight, PlayCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionableWidgets() {
  const myTasks = tasks.filter(t => t.assignee === "e1" && t.status !== "done").slice(0, 4);
  
  // Find at-risk or critical projects
  const attentionProjects = projects.filter(p => p.health === "at-risk" || p.health === "critical").slice(0, 2);
  const criticalTasks = tasks.filter(t => t.priority === "critical" && t.status !== "done").slice(0, 2);

  // Team status
  const onlineEmployees = employees.filter(e => e.status === "online");
  const todaysUpdates = dailyUpdates.filter(u => u.date === "2025-07-15");

  return (
    <div className="grid gap-4 md:grid-cols-3">
      
      {/* Priority Tasks */}
      <Card className="border-border/50 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" /> My Priority Tasks
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-2">
              <Link href="/tasks">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-3 flex-1">
          <div className="space-y-3">
            {myTasks.map(task => (
              <div key={task.id} className="group flex items-start gap-3 hover:bg-accent/30 p-1.5 -mx-1.5 rounded-md transition-colors cursor-pointer">
                <div className="mt-0.5">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{task.project}</p>
                </div>
              </div>
            ))}
            {myTasks.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">No pending tasks. Great job!</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <Card className="border-border/50 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Needs Attention
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-3 flex-1">
          <div className="space-y-4">
            {attentionProjects.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">At-Risk Projects</p>
                {attentionProjects.map(project => (
                  <div key={project.id} className="flex justify-between items-center">
                    <p className="text-xs font-medium truncate pr-2">{project.name}</p>
                    <Badge variant="outline" className="text-[9px] text-red-500 border-red-500/20 bg-red-500/10 shrink-0">
                      {project.health}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            {criticalTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Critical Blockers</p>
                {criticalTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2">
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-xs font-medium text-foreground leading-tight">{task.title}</p>
                  </div>
                ))}
              </div>
            )}
            
            {attentionProjects.length === 0 && criticalTasks.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">All systems healthy.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Overview */}
      <Card className="border-border/50 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Team Pulse
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-2">
              <Link href="/employees">Directory</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-3 flex-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Online Now</p>
                <p className="text-[10px] text-muted-foreground">{onlineEmployees.length} of {employees.length} members</p>
              </div>
              <div className="flex -space-x-2">
                {onlineEmployees.slice(0, 5).map(emp => (
                  <Avatar key={emp.id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-[8px] bg-primary/10">{emp.avatar}</AvatarFallback>
                  </Avatar>
                ))}
                {onlineEmployees.length > 5 && (
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-medium">
                    +{onlineEmployees.length - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div>
                <p className="text-xs font-medium text-foreground">Daily Updates</p>
                <p className="text-[10px] text-muted-foreground">{todaysUpdates.length} submitted today</p>
              </div>
              <Button asChild size="sm" variant="secondary" className="h-6 text-[10px] px-2">
                <Link href="/daily-updates">View Feed</Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div>
                <p className="text-xs font-medium text-foreground">Pending Reviews</p>
                <p className="text-[10px] text-muted-foreground">3 pull requests waiting</p>
              </div>
              <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                Review
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
