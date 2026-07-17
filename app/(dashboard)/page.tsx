import { OverviewBlocks } from "@/components/dashboard/overview-blocks";
import { PriorityPanels } from "@/components/dashboard/priority-panels";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { getCurrentEmployee } from "@/lib/auth";
import {
  getDashboardOverview, getTaskRadar, getAttentionProjects, getDashboardProjectsSummary, getDashboardChartsData, getCompletionTrend,
} from "@/lib/queries/dashboard.queries";

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const [overview, taskRadar, attentionProjects, projectsSummary, chartData, completionTrend] = await Promise.all([
    getDashboardOverview(employee),
    getTaskRadar(employee),
    getAttentionProjects(employee),
    getDashboardProjectsSummary(employee),
    getDashboardChartsData(employee),
    getCompletionTrend(employee),
  ]);

  return (
    <div className="h-full space-y-8 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Overview: 3 compound blocks, nothing to click through to understand */}
      <OverviewBlocks overview={overview} />

      {/* Priority Panels: task radar + needs attention */}
      <PriorityPanels isAdmin={overview.isAdmin} taskRadar={taskRadar} attentionProjects={attentionProjects} />

      {/* Admin/Manager Only: Org-wide Charts */}
      {chartData && <DashboardCharts chartData={chartData} completionTrend={completionTrend} />}

      {/* Projects */}
      <ProjectsSummary projects={projectsSummary} />
    </div>
  );
}
