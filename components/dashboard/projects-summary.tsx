import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, ArrowRight } from "lucide-react";
import { PROJECT_STATUS_COLORS, TASK_PRIORITY_COLORS, formatEnumLabel } from "@/lib/dashboard-colors";
import Link from "next/link";

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  priority: string;
  computedProgress: number;
  team: { name: string } | null;
  lead?: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
}

export function ProjectsSummary({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
            <FolderKanban className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Active Projects</h3>
        </div>
        <Link href="/projects" className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-1 p-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group flex flex-col rounded-lg p-3 transition-colors hover:bg-accent/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-xs font-medium text-foreground">{project.name}</p>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[9px]"
                  style={{
                    borderColor: `${PROJECT_STATUS_COLORS[project.status]}33`,
                    backgroundColor: `${PROJECT_STATUS_COLORS[project.status]}1a`,
                    color: PROJECT_STATUS_COLORS[project.status],
                  }}
                >
                  {formatEnumLabel(project.status)}
                </Badge>
                {project.priority === "CRITICAL" && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[9px]"
                    style={{
                      borderColor: `${TASK_PRIORITY_COLORS.CRITICAL}33`,
                      backgroundColor: `${TASK_PRIORITY_COLORS.CRITICAL}1a`,
                      color: TASK_PRIORITY_COLORS.CRITICAL,
                    }}
                  >
                    Critical
                  </Badge>
                )}
              </div>
              {project.lead && (
                <Avatar className="h-5 w-5 shrink-0 rounded-full" title={`${project.lead.firstName} ${project.lead.lastName}`}>
                  <AvatarImage src={project.lead.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">{project.lead.firstName.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Progress value={project.computedProgress} className="h-1.5 flex-1" indicatorColor={PROJECT_STATUS_COLORS[project.status]} />
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{project.computedProgress}%</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{project.team?.name ?? "No Team"}</span>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground">No active projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
