import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { getCurrentEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { getMonth, getOfficeFor } from "@/lib/attendance/queries";
import { hasPermission } from "@/lib/permissions";
import { todayKey } from "@/lib/attendance/calendar";
import { db } from "@/lib/db";
import { MonthCalendar } from "@/components/attendance/month-calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function AttendancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Attendance</h1>
          <p className="text-sm text-muted-foreground">Your days, times and hours, month by month.</p>
        </div>
        <Suspense fallback={null}>
          <TeamTodayLink />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-lg" />}>
        <MyMonth searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TeamTodayLink() {
  const me = await getCurrentEmployee();
  const canSee = (await hasPermission(me, "attendance:view-all")) || (await db.team.count({ where: { leadId: me.id } })) > 0;
  if (!canSee) return null;
  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <Link href="/attendance/today"><Users className="h-4 w-4" /> Team Today</Link>
    </Button>
  );
}

async function MyMonth({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [me, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  if (!tracksAttendance(me.role)) {
    return <EmptyState icon={CalendarClock} title="Attendance isn't tracked for Super Admins" description="Use Team Today to see everyone else's attendance." />;
  }
  const office = await getOfficeFor(me.id);
  const current = todayKey(office.timezone).slice(0, 7);
  const monthKey = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) && params.month <= current ? params.month : current;
  const month = await getMonth(me.id, monthKey);
  return <MonthCalendar month={month} basePath="/attendance" />;
}
