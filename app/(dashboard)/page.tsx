import { OverviewBlocks } from "@/components/dashboard/overview-blocks";
import { PriorityPanels } from "@/components/dashboard/priority-panels";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { getCurrentEmployee } from "@/lib/auth";
import {
  getDashboardOverview, getTaskRadar, getAttentionProjects, getDashboardProjectsSummary, getDashboardChartsData, getCompletionTrend,
} from "@/lib/queries/dashboard.queries";

import { Suspense } from "react";
import DashboardLoading from "./loading";

async function DashboardData({ employee, overview }: { employee: any, overview: any }) {
  const [taskRadar, attentionProjects, projectsSummary, chartData, completionTrend] = await Promise.all([
    getTaskRadar(employee),
    getAttentionProjects(employee),
    getDashboardProjectsSummary(employee),
    getDashboardChartsData(employee),
    getCompletionTrend(employee),
  ]);

  return (
    <>
      <OverviewBlocks overview={overview} />
      <PriorityPanels isAdmin={overview.isAdmin} taskRadar={taskRadar} attentionProjects={attentionProjects} />
      {chartData && <DashboardCharts chartData={chartData} completionTrend={completionTrend} />}
      <ProjectsSummary projects={projectsSummary} />
    </>
  );
}

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();
  
  // Fetch overview fast for the shell
  const overview = await getDashboardOverview(employee);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";



  return (
    <div className="h-full space-y-8 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {greeting}, {employee.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {overview.isAdmin
              ? "Here's what's happening across your organization today."
              : "Here's what's on your plate today."}
          </p>
        </div>
        <DashboardHeaderActions isAdmin={overview.isAdmin} />
      </div>

      <Suspense fallback={<DashboardLoading />}>
        <DashboardData employee={employee} overview={overview} />
      </Suspense>
    </div>
  );
}
