import { connection } from "next/server";
import Link from "next/link";
import Form from "next/form";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { getTodayBoard } from "@/lib/attendance/queries";
import { fromDateKey } from "@/lib/attendance/calendar";
import { TodayBoard } from "@/components/attendance/today-board";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { ParamsSuspense } from "@/components/ui/params-suspense";

type Params = { date?: string };

export default function TeamDayPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/attendance/team" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Team Attendance
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Team Day</h1>
      </div>
      <ParamsSuspense fallback={<Skeleton className="h-[420px] w-full rounded-lg" />}>
        <Board searchParams={searchParams} />
      </ParamsSuspense>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const [viewer, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  const board = await getTodayBoard(viewer, params.date);
  if (!board) redirect("/attendance");
  const label = fromDateKey(board.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{board.isToday ? "Today" : label} · {board.scope}</p>
        {/* A plain GET form: the URL holds the day, so it can be shared. */}
        <Form action="/attendance/today" className="flex items-center gap-2">
          <label htmlFor="day" className="sr-only">Date</label>
          <DatePicker key={board.dateKey} id="day" name="date" defaultValue={board.dateKey} max={board.isToday ? board.dateKey : undefined} className="w-40" />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Show Day</Button>
          {!board.isToday && <Button asChild size="sm" variant="ghost" className="h-8 text-xs"><Link href="/attendance/today">Today</Link></Button>}
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs"><Link href="/attendance/team"><LayoutGrid className="h-3.5 w-3.5" /> Month</Link></Button>
        </Form>
      </div>
      <TodayBoard board={board} />
    </div>
  );
}
