"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Users, CheckCircle2, Activity } from "lucide-react";
import { projects, employees, tasks } from "@/lib/mock-data";

export function OverviewCards() {
  const activeProjects = projects.filter(p => p.status === "active").length;
  const activeEmployees = employees.length;
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  
  const metrics = [
    {
      title: "Active Projects",
      value: activeProjects,
      description: "+2 from last month",
      icon: FolderKanban,
    },
    {
      title: "Team Members",
      value: activeEmployees,
      description: "Across 4 departments",
      icon: Users,
    },
    {
      title: "Tasks Completed",
      value: completedTasks,
      description: `${Math.round((completedTasks/totalTasks)*100)}% completion rate`,
      icon: CheckCircle2,
    },
    {
      title: "System Uptime",
      value: "99.9%",
      description: "Last 30 days",
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
