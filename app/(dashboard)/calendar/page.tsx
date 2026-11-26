import { Suspense } from "react";
import { connection } from "next/server";
import { checkPermission } from "@/lib/auth";
import { getCalendarDays } from "@/lib/attendance/settings";
import { todayKey } from "@/lib/attendance/calendar";
import { CalendarManager } from "@/components/calendar/calendar-manager";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Holidays, work-from-home days and other changes to the working week.</p>
      </div>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarBody />
      </Suspense>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

async function CalendarBody() {
  await connection();
  // From the start of this year to the end of next year.
  const year = Number(todayKey("Asia/Kolkata").slice(0, 4));
  const [days, canManage, canAnnounce] = await Promise.all([
    getCalendarDays(`${year}-01-01`, `${year + 1}-12-31`),
    checkPermission("leave:manage"),
    checkPermission("announcement:manage"),
  ]);
  return <CalendarManager days={days} currentYear={year} canManage={canManage} canAnnounce={canManage && canAnnounce} />;
}
