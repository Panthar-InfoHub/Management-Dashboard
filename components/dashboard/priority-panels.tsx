import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radar, AlertCircle, CheckCircle2 } from "lucide-react";
import { TASK_PRIORITY_COLORS, PROJECT_STATUS_COLORS, formatEnumLabel } from "@/lib/dashboard-colors";
import { format, isToday, isTomorrow, isPast, endOfDay } from "date-fns";
import Link from "next/link";

interface RadarTask {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | string | null;
  isOverdue: boolean;
  project: { id: string; name: string };
  assignees: Array<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }>;
}

interface AttentionProject {
  id: string;
  name: string;
  priority: string;
  status: string;
  isOverdue: boolean;
  endDate?: Date | string | null;
  team: { name: string } | null;
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  overdueTasksCount?: number;
}

function DueBadge({ dueDate, isOverdue }: { dueDate: Date | string | null; isOverdue: boolean }) {
  if (!dueDate) return null;
  const date = new Date(dueDate);

  // If the date is today in the user's browser timezone, it is always "Due today"
  if (isToday(date)) {
    return (
      <Badge variant="outline" className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400">
        Due today
      </Badge>
    );
  }
  // If the date is tomorrow in the user's browser timezone, it is always "Due tomorrow"
  if (isTomorrow(date)) {
    return (
      <Badge variant="outline" className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400">
        Due tomorrow
      </Badge>
    );
  }
  // Only display Overdue if the entire calendar day has passed
  if (isOverdue || isPast(endOfDay(date))) {
    return (
      <Badge variant="outline" className="shrink-0 border-red-500/20 bg-red-500/10 text-[9px] text-red-600 dark:text-red-400">
        Overdue
      </Badge>
    );
  }
  return <span className="shrink-0 text-[10px] text-muted-foreground">Due {format(date, "MMM d")}</span>;
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 py-8">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PriorityPanels({
  isAdmin,
  taskRadar,
  attentionProjects,
}: {
  isAdmin: boolean;
  taskRadar: RadarTask[];
  attentionProjects: AttentionProject[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Left: Task Radar */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
              <Radar className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{isAdmin ? "Task Deadlines" : "My Priority Tasks"}</h3>
          </div>
          <Link href="/tasks" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
            View All
          </Link>
        </div>
        <div className="flex-1 p-3 overflow-y-auto max-h-[320px] custom-scrollbar">
          <div className="space-y-1">
            {taskRadar.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/40"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: TASK_PRIORITY_COLORS[task.priority] }}
                  title={formatEnumLabel(task.priority)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{task.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{task.project.name}</p>
                </div>
                {isAdmin && task.assignees.length > 0 && (
                  <div className="flex -space-x-1.5 shrink-0">
                    {task.assignees.slice(0, 2).map((a) => (
                      <Avatar key={a.id} className="h-5 w-5 rounded-full ring-2 ring-background">
                        <AvatarImage src={a.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[8px]">{a.firstName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                <DueBadge dueDate={task.dueDate} isOverdue={task.isOverdue} />
              </Link>
            ))}
            {taskRadar.length === 0 && (
              <EmptyRow label={isAdmin ? "No upcoming deadlines across the org." : "All caught up — nothing due soon."} />
            )}
          </div>
        </div>
      </div>

      {/* Right: Needs Attention */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background">
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/10 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
            <AlertCircle className="h-4.5 w-4.5 text-red-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Projects Needing Attention</h3>
        </div>
        <div className="flex-1 p-3 overflow-y-auto max-h-[320px] custom-scrollbar">
          <div className="space-y-1">
            {attentionProjects.map((project) => {
              const date = project.endDate ? new Date(project.endDate) : null;
              const isProjectOverdue =
                project.isOverdue &&
                date &&
                !isToday(date) &&
                isPast(endOfDay(date));

              const isProjectDueToday = date && isToday(date);
              const isProjectDueTomorrow = date && isTomorrow(date);

              const allTasksDone =
                project.totalTasks !== undefined &&
                project.totalTasks > 0 &&
                project.completedTasks === project.totalTasks;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group flex items-center justify-between gap-3 rounded-md p-2 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                        <span>{project.team?.name ?? "No team"}</span>
                        {date && (
                          <>
                            <span>•</span>
                            <span className={isProjectOverdue ? "text-red-500/90 font-medium" : ""}>
                              Target: {format(date, "MMM d, yyyy")}
                            </span>
                          </>
                        )}
                        {project.totalTasks !== undefined && project.totalTasks > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {project.completedTasks}/{project.totalTasks} tasks ({project.progress}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isProjectOverdue && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-red-500/20 bg-red-500/10 text-[9px] text-red-600 dark:text-red-400"
                      >
                        Overdue
                      </Badge>
                    )}
                    {isProjectDueToday && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400"
                      >
                        Due today
                      </Badge>
                    )}
                    {isProjectDueTomorrow && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400"
                      >
                        Due tomorrow
                      </Badge>
                    )}
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
                    {!isProjectOverdue && project.overdueTasksCount !== undefined && project.overdueTasksCount > 0 && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400"
                      >
                        {project.overdueTasksCount} overdue {project.overdueTasksCount === 1 ? "task" : "tasks"}
                      </Badge>
                    )}
                    {allTasksDone && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-500/20 bg-emerald-500/10 text-[9px] text-emerald-600 dark:text-emerald-400"
                      >
                        All tasks done
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
            {attentionProjects.length === 0 && <EmptyRow label="No projects need attention right now." />}
          </div>
        </div>
      </div>
    </div>
  );
}
