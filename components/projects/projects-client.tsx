"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Filter, Search, ArrowUpRight, Calendar, DollarSign, FolderKanban, X } from "lucide-react";
import { updateProjectStatusAction } from "@/lib/actions/project.actions";
import { format, isPast, isToday, isTomorrow, endOfDay } from "date-fns";


const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20", ON_HOLD: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" };


export function ProjectsClient({ initialProjects, canCreate }: { initialProjects: any[], canCreate: boolean }) {
  const [projectList, setProjectList] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase();
    return projectList.filter((p) => {
      const matchesSearch = !q || 
                            p.name.toLowerCase().includes(q) || 
                            (p.description || "").toLowerCase().includes(q) ||
                            (p.team?.name || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || p.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projectList, search, statusFilter, priorityFilter]);

  if (projectList.length === 0) {
    return (
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
        
        <EmptyState 
          icon={FolderKanban}
          title="No projects found"
          description="You can manage tasks, track progress, and collaborate with your team."
          {...(canCreate ? { actionLabel: "Create New Project", actionHref: "/projects/new" } : {})}
          className="mt-6 h-[400px]"
        />
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-0 flex-1 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end shrink-0 gap-4">
        {canCreate && (
          <Button asChild size="sm" className="gap-2 text-xs w-full sm:w-auto">
            <Link href="/projects/new">
              <Plus className="h-3.5 w-3.5" /> New Project
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search projects…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm" 
          />
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("h-9 min-w-[130px] text-xs transition-colors", statusFilter !== "ALL" && "border-primary/50 bg-primary/5 text-foreground font-medium")}>
              <div className="flex items-center gap-1.5 truncate">
                <Filter className={cn("h-3.5 w-3.5 shrink-0", statusFilter !== "ALL" ? "text-primary" : "text-muted-foreground")} />
                <SelectValue placeholder="All Statuses" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.keys(statusColors).map(status => (
                <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className={cn("h-9 min-w-[130px] text-xs transition-colors", priorityFilter !== "ALL" && "border-primary/50 bg-primary/5 text-foreground font-medium")}>
              <div className="flex items-center gap-1.5 truncate">
                <Filter className={cn("h-3.5 w-3.5 shrink-0", priorityFilter !== "ALL" ? "text-primary" : "text-muted-foreground")} />
                <SelectValue placeholder="All Priorities" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              {Object.keys(priorityColors).map(priority => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 border border-dashed border-border/60 hover:border-border hover:bg-muted/40"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="grid" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="grid" className="text-xs">Grid</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-0 pt-4 flex-1 overflow-y-auto pr-2 pb-4 focus-visible:outline-none focus-visible:ring-0">
          {filteredProjects.length === 0 ? (
            <EmptyState 
              icon={FolderKanban}
              title="No projects match your filters"
              description="Try adjusting your search or filters to see more projects."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch("");
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
              }}
              className="mt-6 h-[400px]"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
              const lead = project.lead;
              const membersList = project.members.map((m: any) => m.employee);
              const date = project.endDate ? new Date(project.endDate) : null;
              const isOverdue = Boolean(date && !["COMPLETED", "ARCHIVED"].includes(project.status) && !isToday(date) && isPast(endOfDay(date)));
              const isDueToday = Boolean(date && !["COMPLETED", "ARCHIVED"].includes(project.status) && isToday(date));
              const isDueTomorrow = Boolean(date && !["COMPLETED", "ARCHIVED"].includes(project.status) && isTomorrow(date));

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
                    <div className="flex items-center gap-4 flex-wrap mt-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        Status: <Badge variant="outline" className={cn("px-1.5 py-0 rounded-sm shadow-none", statusColors[project.status])}>{project.status.replace("_", " ")}</Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        Priority: <Badge variant="outline" className={cn("px-1.5 py-0 rounded-sm shadow-none", priorityColors[project.priority])}>{project.priority}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Progress</span>
                        <span className="text-[11px] font-medium">{project.computedProgress}%</span>
                      </div>
                      <Progress value={project.computedProgress} className="h-1.5" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] gap-1.5 flex-wrap">
                      <div className={cn("flex items-center gap-1.5", isOverdue ? "text-red-500/90 font-medium" : "text-muted-foreground")}>
                        <Calendar className={cn("h-3 w-3", isOverdue ? "text-red-500" : "text-muted-foreground")} />
                        <span>{date ? `Target: ${format(date, "MMM d, yyyy")}` : "No deadline"}</span>
                      </div>
                      {isOverdue && (
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-[9px] text-red-600 dark:text-red-400 py-0 px-1 font-medium">
                          Overdue
                        </Badge>
                      )}
                      {isDueToday && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400 py-0 px-1">
                          Due today
                        </Badge>
                      )}
                      {isDueTomorrow && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400 py-0 px-1">
                          Due tomorrow
                        </Badge>
                      )}
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
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0 pt-4 flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-0">
          {filteredProjects.length === 0 ? (
            <EmptyState 
              icon={FolderKanban}
              title="No projects match your filters"
              description="Try adjusting your search or filters to see more projects."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch("");
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
              }}
              className="mt-6 h-[400px]"
            />
          ) : (
            <div className="border border-border/40 rounded-lg overflow-x-auto bg-background">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="min-w-[250px] font-medium text-[11px] uppercase tracking-wider">Project</TableHead>
                    <TableHead className="min-w-[120px] font-medium text-[11px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="min-w-[150px] font-medium text-[11px] uppercase tracking-wider">Progress</TableHead>
                    <TableHead className="min-w-[150px] font-medium text-[11px] uppercase tracking-wider">Team</TableHead>
                    <TableHead className="min-w-[150px] font-medium text-[11px] uppercase tracking-wider">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                  const lead = project.lead;
                  const date = project.endDate ? new Date(project.endDate) : null;
                  const isOverdue = Boolean(date && !["COMPLETED", "ARCHIVED"].includes(project.status) && !isToday(date) && isPast(endOfDay(date)));
                  const isDueToday = Boolean(date && !["COMPLETED", "ARCHIVED"].includes(project.status) && isToday(date));

                  return (
                    <TableRow 
                      key={project.id} 
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead?.firstName} {lead?.lastName}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("px-1.5 py-0 rounded-sm shadow-none", statusColors[project.status])}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <Progress value={project.computedProgress} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-medium shrink-0">{project.computedProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {project.team?.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {date ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={isOverdue ? "text-red-500/90 font-medium" : "text-muted-foreground"}>
                              Target: {format(date, "MMM d, yyyy")}
                            </span>
                            {isOverdue && (
                              <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-[9px] text-red-600 dark:text-red-400 py-0 px-1 font-medium">
                                Overdue
                              </Badge>
                            )}
                            {isDueToday && (
                              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400 py-0 px-1">
                                Due today
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
