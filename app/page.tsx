import { OverviewCards } from "@/components/dashboard/overview-cards";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TodayAgenda } from "@/components/dashboard/today-agenda";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export default function DashboardPage() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{greeting}, Shiva</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your organization today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-2 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Submit Update
          </Button>
          <Button size="sm" className="gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Quick Action
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards />

      {/* Charts + Insights Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts />
        </div>
        <div className="space-y-4">
          <InsightsPanel />
          <TodayAgenda />
        </div>
      </div>

      {/* Activity + Projects Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed />
        <ProjectsSummary />
      </div>
    </div>
  );
}
