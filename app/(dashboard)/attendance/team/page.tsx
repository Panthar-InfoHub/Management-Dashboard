import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Download } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTeamMonth } from "@/lib/attendance/queries";
import { getOffices } from "@/lib/attendance/settings";
import { todayKey } from "@/lib/attendance/calendar";
import { TeamMonthGrid } from "@/components/attendance/team-month-grid";
import { MonthNav } from "@/components/attendance/month-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Params = { month?: string; team?: string };

export default function TeamAttendancePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/attendance" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Attendance
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Team Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everyone&apos;s month at a glance. Hover a cell for details. Admins and HR can click any day to correct it.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-lg" />}>
        <TeamMonthBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TeamMonthBody({ searchParams }: { searchParams: Promise<Params> }) {
  const [viewer, params, offices] = await Promise.all([getCurrentEmployee(), searchParams, getOffices()]);
  const current = todayKey((offices.find((o) => o.isDefault) ?? offices[0])?.timezone ?? "Asia/Kolkata").slice(0, 7);
  const monthKey = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) && params.month <= current ? params.month : current;
  const [data, canExport] = await Promise.all([getTeamMonth(viewer, monthKey, params.team ?? null), hasPermission(viewer, "attendance:export")]);
  if (!data) redirect("/attendance");

  const href = (month: string | null, team: string | null = data.teamId) => {
    const q = new URLSearchParams();
    if (month) q.set("month", month);
    if (team) q.set("team", team);
    const s = q.toString();
    return s ? `/attendance/team?${s}` : "/attendance/team";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav monthKey={monthKey} currentMonth={current} href={(m) => href(m)} />
        <div className="flex flex-wrap items-center gap-2">
          {data.teams.length > 1 && (
            <nav className="flex flex-wrap gap-1" aria-label="Filter by team">
              <Button asChild size="sm" variant={data.teamId ? "ghost" : "secondary"} className="h-8 text-xs"><Link href={href(monthKey === current ? null : monthKey, null)}>All</Link></Button>
              {data.teams.map((t) => (
                <Button key={t.id} asChild size="sm" variant={data.teamId === t.id ? "secondary" : "ghost"} className="h-8 text-xs">
                  <Link href={href(monthKey === current ? null : monthKey, t.id)}>{t.name}</Link>
                </Button>
              ))}
            </nav>
          )}
          <Button asChild variant="outline" size="sm" className="h-8 gap-2 text-xs">
            <Link href="/attendance/today"><CalendarDays className="h-3.5 w-3.5" /> Day View</Link>
          </Button>
          {canExport && (
            <Button asChild variant="outline" size="sm" className="h-8 gap-2 text-xs">
              <a href={`/api/attendance/export?month=${monthKey}${data.teamId ? `&team=${data.teamId}` : ""}`} download>
                <Download className="h-3.5 w-3.5" /> Export Excel
              </a>
            </Button>
          )}
        </div>
      </div>
      <TeamMonthGrid data={data} />
    </div>
  );
}
