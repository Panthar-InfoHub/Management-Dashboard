import { OverviewBlocks } from "@/components/dashboard/overview-blocks";
import { PriorityPanels } from "@/components/dashboard/priority-panels";
import { ProjectsSummary } from "@/components/dashboard/projects-summary";
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { getCurrentEmployee } from "@/lib/auth";
import {
  getDashboardOverview, getTaskRadar, getAttentionProjects, getDashboardProjectsSummary, getDashboardChartsData, getCompletionTrend,
} from "@/lib/queries/dashboard.queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardBodySkeleton } from "./dashboard-skeleton";

// recharts is a large client-only dependency used exclusively by this section;
// splitting it into its own chunk keeps it out of the initial dashboard bundle.
const DashboardCharts = dynamic(() =>
  import("@/components/dashboard/dashboard-charts").then((mod) => mod.DashboardCharts)
);

function PriorityPanelsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card shadow-sm">
          <div className="space-y-2 border-b border-border/40 p-5">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="w-full space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-4 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-[320px] space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
      <div className="h-[320px] space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    </div>
  );
}

function ProjectsSummarySkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function DashboardPriorityPanels({ employee, isAdmin }: { employee: any, isAdmin: boolean }) {
  const [taskRadar, attentionProjects] = await Promise.all([
    getTaskRadar(employee),
    getAttentionProjects(employee)
  ]);
  return <PriorityPanels isAdmin={isAdmin} taskRadar={taskRadar} attentionProjects={attentionProjects} />;
}

async function DashboardChartsSection({ employee }: { employee: any }) {
  const [chartData, completionTrend] = await Promise.all([
    getDashboardChartsData(employee),
    getCompletionTrend(employee)
  ]);
  if (!chartData) return null;
  return <DashboardCharts chartData={chartData} completionTrend={completionTrend} />;
}

async function DashboardProjectsSummary({ employee }: { employee: any }) {
  const projectsSummary = await getDashboardProjectsSummary(employee);
  return <ProjectsSummary projects={projectsSummary} />;
}

async function DashboardHeaderAsync() {
  const employee = await getCurrentEmployee();
  const overview = await getDashboardOverview(employee);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
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

      <OverviewBlocks overview={overview} />
      
      <Suspense fallback={<PriorityPanelsSkeleton />}>
        <DashboardPriorityPanels employee={employee} isAdmin={overview.isAdmin} />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardChartsSection employee={employee} />
      </Suspense>

      <Suspense fallback={<ProjectsSummarySkeleton />}>
        <DashboardProjectsSummary employee={employee} />
      </Suspense>
    </>
  );
}

export default function DashboardPage() {
  // Instantly return the static page shell
  return (
    <div className="space-y-8 p-6">
      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardHeaderAsync />
      </Suspense>
    </div>
  );
}
