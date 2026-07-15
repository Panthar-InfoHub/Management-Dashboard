"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { activityFeed, employees } from "@/lib/mock-data";
import {
  ClipboardCheck, GitBranch, Paintbrush, Play, FileText,
  FolderPlus, UserPlus, CalendarClock, CheckCircle, Rocket, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
  task: { icon: ClipboardCheck, color: "text-blue-500 bg-blue-500/10" },
  git: { icon: GitBranch, color: "text-purple-500 bg-purple-500/10" },
  design: { icon: Paintbrush, color: "text-pink-500 bg-pink-500/10" },
  sprint: { icon: Play, color: "text-green-500 bg-green-500/10" },
  update: { icon: FileText, color: "text-cyan-500 bg-cyan-500/10" },
  project: { icon: FolderPlus, color: "text-indigo-500 bg-indigo-500/10" },
  user: { icon: UserPlus, color: "text-emerald-500 bg-emerald-500/10" },
  calendar: { icon: CalendarClock, color: "text-amber-500 bg-amber-500/10" },
  review: { icon: CheckCircle, color: "text-teal-500 bg-teal-500/10" },
  release: { icon: Rocket, color: "text-orange-500 bg-orange-500/10" },
};

const typeLabels: Record<string, string> = {
  task_assigned: "assigned a task",
  pr_created: "created a pull request",
  design_uploaded: "uploaded a design",
  sprint_started: "started a sprint",
  update_submitted: "submitted daily update",
  project_created: "created a project",
  employee_joined: "joined the team",
  deadline_extended: "extended a deadline",
  review_completed: "completed a review",
  release_published: "published a release",
};

export function ActivityFeed() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5">
            <Activity className="h-3.5 w-3.5 text-foreground" />
          </div>
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative space-y-0">
          {activityFeed.map((item, idx) => {
            const emp = employees.find(e => e.id === item.user);
            const config = iconMap[item.icon] || iconMap.task;
            const Icon = config.icon;
            return (
              <div key={item.id} className="group relative flex gap-3 py-2.5 hover:bg-accent/30 rounded-md px-2 -mx-2 transition-colors">
                {/* Timeline line */}
                {idx < activityFeed.length - 1 && (
                  <div className="absolute left-[18px] top-[36px] bottom-0 w-px bg-border" />
                )}
                <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", config.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium text-foreground">{emp?.name || "Unknown"}</span>
                    <span className="text-muted-foreground"> {typeLabels[item.type] || item.type}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.target}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/60 pt-0.5">{item.time}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
