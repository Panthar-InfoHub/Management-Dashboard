import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { getTodayBoard } from "@/lib/attendance/queries";
import { fromDateKey } from "@/lib/attendance/calendar";
import { TodayBoard } from "@/components/attendance/today-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Params = { date?: string };

export default function TeamDayPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/attendance/team" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Team Attendance
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Team Day</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-lg" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: Promise<Params> }) {
  const [viewer, params] = await Promise.all([getCurrentEmployee(), searchParams]);
  const board = await getTodayBoard(viewer, params.date);
  if (!board) redirect("/attendance");
  const label = fromDateKey(board.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{board.isToday ? "Today" : label} · {board.scope}</p>
        {/* A plain GET form: works before any JavaScript loads. */}
        <form action="/attendance/today" className="flex items-center gap-2">
          <label htmlFor="day" className="sr-only">Date</label>
          <Input id="day" name="date" type="date" defaultValue={board.dateKey} max={board.isToday ? board.dateKey : undefined} className="h-8 w-40 text-xs" />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Show Day</Button>
          {!board.isToday && <Button asChild size="sm" variant="ghost" className="h-8 text-xs"><Link href="/attendance/today">Today</Link></Button>}
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs"><Link href="/attendance/team"><LayoutGrid className="h-3.5 w-3.5" /> Month</Link></Button>
        </form>
      </div>
      <TodayBoard board={board} />
    </div>
  );
}
