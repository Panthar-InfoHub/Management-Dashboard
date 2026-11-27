import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { getCurrentEmployee, type AuthEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { getMyToday, getTodayBoard } from "@/lib/attendance/queries";
import { minutesOfDay } from "@/lib/attendance/calendar";
import { getAnnouncements } from "@/lib/queries/announcement.queries";
import {
  getAttentionTasks, getKpis, getPendingApprovals, getProjectHealth, getStageBreakdown, getThroughput, getWorkload, isOrgView,
} from "@/lib/queries/dashboard.queries";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockBoundary } from "@/components/ui/block-boundary";
import { ClockCard } from "@/components/attendance/clock-card";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { AttentionList, ProjectHealthList, StageBreakdown, StatList, WorkloadBars } from "@/components/dashboard/dashboard-blocks";

// recharts is only needed for the throughput chart; keep it in its own chunk.
const ThroughputPanel = dynamic(() => import("@/components/dashboard/throughput-chart").then((m) => m.ThroughputPanel), {
  loading: () => <Skeleton className="h-[392px] w-full rounded-xl lg:col-span-2" />,
});

const TZ = "Asia/Kolkata";

// ─── Skeletons sized like the real blocks, so nothing jumps when data lands ───

function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/70 bg-card p-5 ${className ?? ""}`}>
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-14" /><Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Blocks: each fetches its own data and streams in on its own ───

async function Kpis({ employee }: { employee: AuthEmployee }) {
  return <KpiStrip k={await getKpis(employee)} />;
}

async function Throughput({ employee }: { employee: AuthEmployee }) {
  const [{ weekly, daily }, org] = await Promise.all([getThroughput(employee), isOrgView(employee)]);
  return <ThroughputPanel weekly={weekly} daily={daily} scope={org ? "All tasks" : "Your tasks"} />;
}

async function Stages({ employee }: { employee: AuthEmployee }) {
  const [stages, approvals] = await Promise.all([getStageBreakdown(employee), getPendingApprovals(employee)]);
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Open Work by Stage" action={{ href: "/tasks", label: "Board" }}>
        <StageBreakdown stages={stages} />
      </Panel>
      {approvals && (
        <Panel title="Waiting for Your Approval" action={{ href: "/approvals", label: "Open" }} bodyClassName="pb-1">
          <StatList items={[
            { label: "Leave requests", value: approvals.leave, href: "/approvals" },
            { label: "Work from home", value: approvals.wfh, href: "/approvals" },
            { label: "Time corrections", value: approvals.fixes, href: "/approvals" },
            { label: "Late arrivals", value: approvals.lateArrivals, href: "/approvals" },
          ]} />
        </Panel>
      )}
    </div>
  );
}

async function Attention({ employee }: { employee: AuthEmployee }) {
  const tasks = await getAttentionTasks(employee);
  return (
    <Panel title="Needs Attention" description="Overdue or due in the next 7 days" action={{ href: "/tasks?view=list&due=OVERDUE,WEEK", label: "All" }}>
      <AttentionList tasks={tasks} />
    </Panel>
  );
}

async function Health({ employee }: { employee: AuthEmployee }) {
  const projects = await getProjectHealth(employee);
  return (
    <Panel title="Project Health" description="Most urgent first" action={{ href: "/projects", label: "Projects" }}>
      <ProjectHealthList projects={projects} />
    </Panel>
  );
}

async function Workload({ employee }: { employee: AuthEmployee }) {
  const rows = await getWorkload(employee);
  if (!rows) return null;
  return (
    <Panel title="Workload by Owner" description="Open tasks each person owns">
      <WorkloadBars rows={rows} />
    </Panel>
  );
}

async function TeamToday({ employee }: { employee: AuthEmployee }) {
  if (!(await isOrgView(employee))) return null;
  const board = await getTodayBoard(employee);
  if (!board) return null;
  const rows = board.rows;
  type Row = (typeof rows)[number];
  const count = (fn: (r: Row) => boolean) => rows.filter(fn).length;
  const working = (r: Row) => !["WEEKLY_OFF", "HOLIDAY"].includes(r.status ?? "");
  return (
    <Panel title="Team Today" description={board.scope} action={{ href: "/attendance/today", label: "Details" }} bodyClassName="pb-1">
      <StatList items={[
        { label: "Clocked in", value: count((r) => !!r.checkIn) },
        { label: "Working from home", value: count((r) => r.status === "WFH") },
        { label: "Late", value: count((r) => r.isLate) },
        { label: "On leave", value: count((r) => r.status === "ON_LEAVE" || !!r.leave) },
        { label: "Not clocked in yet", value: count((r) => working(r) && !r.checkIn && r.status !== "ON_LEAVE" && !r.leave), tone: "critical" },
      ]} />
    </Panel>
  );
}

async function Announcements({ employee }: { employee: AuthEmployee }) {
  const posts = await getAnnouncements(employee, { limit: 2 });
  if (posts.length === 0) return null;
  return (
    <Panel title="Announcements" action={{ href: "/announcements", label: "All" }}>
      <div className="grid gap-3 md:grid-cols-2">{posts.map((a) => <AnnouncementCard key={a.id} a={a} compact />)}</div>
    </Panel>
  );
}

async function Clock({ employee }: { employee: AuthEmployee }) {
  if (!tracksAttendance(employee.role)) return null;
  const today = await getMyToday(employee);
  return today ? <ClockCard today={today} /> : null;
}

// ─── Page ───

async function Dashboard() {
  await connection();
  const employee = await getCurrentEmployee();
  const org = await isOrgView(employee);
  const now = new Date();
  const hour = Math.floor(minutesOfDay(TZ, now) / 60);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        eyebrow={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
        title={`${greeting}, ${employee.firstName}`}
        description={org ? "How work is moving across the company." : "Your work at a glance."}
        actions={
          <>
            {org && <Button asChild variant="outline" size="sm"><Link href="/projects/new">New Project</Link></Button>}
            <Button asChild size="sm" className="gap-1.5"><Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> New Task</Link></Button>
          </>
        }
      />

      <BlockBoundary label="Attendance"><Suspense fallback={<Skeleton className="h-[84px] w-full rounded-xl" />}><Clock employee={employee} /></Suspense></BlockBoundary>
      <BlockBoundary label="Summary"><Suspense fallback={<KpiSkeleton />}><Kpis employee={employee} /></Suspense></BlockBoundary>

      <div className="grid gap-4 lg:grid-cols-3">
        <BlockBoundary label="Throughput" className="lg:col-span-2"><Suspense fallback={<Skeleton className="h-[392px] w-full rounded-xl lg:col-span-2" />}><Throughput employee={employee} /></Suspense></BlockBoundary>
        <BlockBoundary label="Open work"><Suspense fallback={<PanelSkeleton rows={4} />}><Stages employee={employee} /></Suspense></BlockBoundary>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BlockBoundary label="Needs Attention"><Suspense fallback={<PanelSkeleton rows={6} />}><Attention employee={employee} /></Suspense></BlockBoundary>
        <BlockBoundary label="Project Health"><Suspense fallback={<PanelSkeleton rows={6} />}><Health employee={employee} /></Suspense></BlockBoundary>
      </div>

      {org && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BlockBoundary label="Workload"><Suspense fallback={<PanelSkeleton rows={6} />}><Workload employee={employee} /></Suspense></BlockBoundary>
          <BlockBoundary label="Team Today"><Suspense fallback={<PanelSkeleton rows={5} />}><TeamToday employee={employee} /></Suspense></BlockBoundary>
        </div>
      )}

      <BlockBoundary label="Announcements"><Suspense fallback={null}><Announcements employee={employee} /></Suspense></BlockBoundary>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-56" /></div>
      <KpiSkeleton />
      <div className="grid gap-4 lg:grid-cols-3"><PanelSkeleton rows={5} className="lg:col-span-2" /><PanelSkeleton rows={4} /></div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
