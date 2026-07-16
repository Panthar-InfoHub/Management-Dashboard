import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const healthColors: Record<string, string> = {
  GOOD: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  AT_RISK: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  PLANNING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
  ON_HOLD: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
};

export function ProjectsSummary({ projects }: { projects: any[] }) {
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
        {projects.map((project) => {
          return (
            <div key={project.id} className="group rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-accent/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                  <Badge variant="outline" className={cn("text-[9px] shrink-0", statusColors[project.status])}>{project.status.replace("_", " ")}</Badge>
                </div>
                <Badge variant="outline" className={cn("text-[9px] shrink-0", healthColors[project.health])}>{project.health.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={project.computedProgress} className="h-1.5 flex-1" />
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">{project.computedProgress}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{project.team?.name || "No Team"}</span>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">You don't have any active projects yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
