"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { projects, employees } from "@/lib/mock-data";
import { FolderKanban, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const healthColors: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  "at-risk": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20",
};

const statusColors: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  delayed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
};

export function ProjectsSummary() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10">
              <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
          </div>
          <Link href="/projects" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {projects.filter(p => p.status !== "completed").slice(0, 4).map((project) => {
          const lead = employees.find(e => e.id === project.lead);
          return (
            <div key={project.id} className="group rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-accent/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                  <Badge variant="outline" className={cn("text-[9px] shrink-0", statusColors[project.status])}>{project.status}</Badge>
                </div>
                <Badge variant="outline" className={cn("text-[9px] shrink-0", healthColors[project.health])}>{project.health}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={project.progress} className="h-1.5 flex-1" />
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">{project.progress}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[7px] bg-primary/10">{lead?.avatar}</AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground">{lead?.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{project.team}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
