import { connection } from "next/server";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { getCurrentEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import { getAttendanceScope, getMonth, getOfficeFor } from "@/lib/attendance/queries";
import { getMyAttendanceRequests } from "@/lib/leave/queries";
import { todayKey } from "@/lib/attendance/calendar";
import { MonthCalendar } from "@/components/attendance/month-calendar";
import { RequestDialog } from "@/components/leave/request-dialog";
import { MyRequests } from "@/components/leave/my-requests";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ParamsSuspense } from "@/components/ui/params-suspense";
import { EmptyState } from "@/components/ui/empty-state";

type Params = { month?: string; fix?: string };

export default function AttendancePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your days, times and hours. Ask for WFH or fix a day from here.</p>
      </div>
      <ParamsSuspense fallback={<AttendanceSkeleton />}>
        <AttendanceBody searchParams={searchParams} />
      </ParamsSuspense>
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}</div>
      <Skeleton className="h-[620px] w-full rounded-xl" />
    </div>
  );
}

async function AttendanceBody({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const [me, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  const scope = await getAttendanceScope(me);
  const teamLink = scope && (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <Link href="/attendance/team"><Users className="h-4 w-4" /> Team Attendance</Link>
    </Button>
  );

  if (!tracksAttendance(me.role)) {
    return (
      <div className="space-y-4">
        {teamLink && <div className="flex justify-end">{teamLink}</div>}
        <EmptyState icon={CalendarClock} title="Attendance isn't tracked for Super Admins" description="Use Team Attendance to see everyone else's attendance." />
      </div>
    );
  }

  const office = await getOfficeFor(me.id);
  const today = todayKey(office.timezone);
  const current = today.slice(0, 7);
  const monthKey = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) && params.month <= current ? params.month : current;
  const fixDate = params.fix && /^\d{4}-\d{2}-\d{2}$/.test(params.fix) && params.fix <= today ? params.fix : undefined;
  const [month, requests] = await Promise.all([getMonth(me.id, monthKey), getMyAttendanceRequests(me)]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RequestDialog kind="WFH" today={today} variant="outline" />
          {/* key: a new ?fix= date opens a fresh, pre-filled form */}
          <RequestDialog key={fixDate ?? "fix"} kind="ATTENDANCE_FIX" today={today} variant="outline" defaultDate={fixDate} defaultOpen={!!fixDate} />
          {teamLink}
        </div>
        <MonthCalendar month={month} basePath="/attendance" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">My WFH and Attendance Fix Requests</h2>
        <MyRequests requests={requests?.requests ?? []} emptyText="No WFH or fix requests yet." />
      </section>
    </div>
  );
}
