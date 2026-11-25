import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { getTodayBoard } from "@/lib/attendance/queries";
import { fromDateKey } from "@/lib/attendance/calendar";
import { TodayBoard } from "@/components/attendance/today-board";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamTodayPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/attendance" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Attendance
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Team Today</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Who&apos;s in, late, or not in yet.</p>}>
          <Subtitle />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-lg" />}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Subtitle() {
  const board = await getTodayBoard(await getCurrentEmployee());
  if (!board) return null;
  const day = fromDateKey(board.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return <p className="text-sm text-muted-foreground">{day} · {board.scope}</p>;
}

async function Board() {
  const board = await getTodayBoard(await getCurrentEmployee());
  if (!board) redirect("/attendance");
  return <TodayBoard board={board} />;
}
