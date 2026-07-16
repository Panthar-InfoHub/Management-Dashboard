import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Target, AlertCircle, Users, ArrowUpRight, PlayCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionableWidgetsProps {
  metrics: {
    attentionProjects: Array<{ id: string; name: string; health: string }>;
    priorityTasks: Array<{ id: string; title: string; project: { name: string } }>;
    pendingReviews: number;
    teamPulse: {
      totalEmployees: number;
      onlineCount: number;
      todaysUpdates: number;
    }
  };
}

export function ActionableWidgets({ metrics }: ActionableWidgetsProps) {
  const { priorityTasks, attentionProjects, pendingReviews, teamPulse } = metrics;

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
            {priorityTasks.map(task => (
              <div key={task.id} className="group flex items-start gap-3 hover:bg-accent/30 p-1.5 -mx-1.5 rounded-md transition-colors cursor-pointer">
                <div className="mt-0.5">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{task.project.name}</p>
                </div>
              </div>
            ))}
            {priorityTasks.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">No pending priority tasks. Great job!</div>
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
                      {project.health.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            {attentionProjects.length === 0 && (
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
                <p className="text-xs font-medium text-foreground">Online Presence</p>
                <p className="text-[10px] text-muted-foreground">{teamPulse.onlineCount} of {teamPulse.totalEmployees} members</p>
              </div>
              <div className="flex -space-x-2">
                {/* Real avatars will be fetched when we build the presence service */}
                <div className="h-6 w-6 rounded-full border-2 border-background bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[8px] font-bold">
                  {teamPulse.onlineCount}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div>
                <p className="text-xs font-medium text-foreground">Daily Updates</p>
                <p className="text-[10px] text-muted-foreground">{teamPulse.todaysUpdates} submitted today</p>
              </div>
              <Button asChild size="sm" variant="secondary" className="h-6 text-[10px] px-2">
                <Link href="/daily-updates">View Feed</Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div>
                <p className="text-xs font-medium text-foreground">Pending Reviews</p>
                <p className="text-[10px] text-muted-foreground">{pendingReviews} pull requests waiting</p>
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
