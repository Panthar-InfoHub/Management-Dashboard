import { ActionableWidgets } from "@/components/dashboard/productive-widgets";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TodayAgenda } from "@/components/dashboard/today-agenda";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { getDashboardActionableMetrics, getDashboardProjectsSummary, getDashboardActivityFeed } from "@/lib/queries/dashboard.queries";

export default async function DashboardPage() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  // Fetch real data from the DAL
  const actionableMetrics = await getDashboardActionableMetrics();
  const projectsSummary = await getDashboardProjectsSummary();
  const activityFeed = await getDashboardActivityFeed();

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{greeting}, Shiva</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your organization today.
          </p>
        </div>
        <DashboardHeaderActions />
      </div>

      {/* Actionable Productive Row */}
      <ActionableWidgets metrics={actionableMetrics} />

      {/* Charts Row */}
      <div className="grid gap-4">
        <DashboardCharts />
      </div>

      {/* Activity + Projects Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed activities={activityFeed} />
        <ProjectsSummary projects={projectsSummary} />
      </div>
    </div>
  );
}
