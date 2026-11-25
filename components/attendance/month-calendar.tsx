import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue } from "@/lib/attendance/rules";
import { STATUS_STYLES } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import type { getMonth } from "@/lib/attendance/queries";

type Month = Awaited<ReturnType<typeof getMonth>>;

const WEEK_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(monthKey: string) {
  return fromDateKey(`${monthKey}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

const SUMMARY: AttendanceStatusValue[] = ["PRESENT", "WFH", "LATE", "HALF_DAY", "ON_LEAVE", "ABSENT"];

/** Month grid, Monday first. Server component: no client JavaScript. */
export function MonthCalendar({ month, basePath }: { month: Month; basePath: string }) {
  const firstWeekday = (fromDateKey(month.days[0].dateKey).getUTCDay() + 6) % 7; // Monday = 0
  const counts = new Map<string, number>();
  let minutes = 0, overtime = 0, early = 0, missed = 0;
  for (const d of month.days) {
    if (d.status) counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
    minutes += d.workMinutes ?? 0;
    overtime += d.overtimeMinutes ?? 0;
    if (d.leftEarly) early++;
    if (d.missedCheckout) missed++;
  }
  const currentMonth = month.today.slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous month">
            <Link href={`${basePath}?month=${shiftMonth(month.monthKey, -1)}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <h2 className="w-40 text-center text-sm font-medium">{monthTitle(month.monthKey)}</h2>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Next month" disabled={month.monthKey >= currentMonth}>
            <Link href={`${basePath}?month=${shiftMonth(month.monthKey, 1)}`} aria-disabled={month.monthKey >= currentMonth} className={cn(month.monthKey >= currentMonth && "pointer-events-none opacity-40")}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {month.monthKey !== currentMonth && (
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs"><Link href={basePath}>This Month</Link></Button>
          )}
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SUMMARY.map((s) => (
            <div key={s} className="flex gap-1"><dt>{ATTENDANCE_STATUS_LABELS[s]}</dt><dd className="font-medium tabular-nums text-foreground">{counts.get(s) ?? 0}</dd></div>
          ))}
          <div className="flex gap-1"><dt>Left early</dt><dd className="font-medium tabular-nums text-foreground">{early}</dd></div>
          <div className="flex gap-1"><dt>Missed checkout</dt><dd className="font-medium tabular-nums text-foreground">{missed}</dd></div>
          <div className="flex gap-1"><dt>Worked</dt><dd className="font-medium tabular-nums text-foreground">{formatDuration(minutes)}</dd></div>
          <div className="flex gap-1"><dt>Overtime</dt><dd className="font-medium tabular-nums text-foreground">{formatDuration(overtime)}</dd></div>
        </dl>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40 text-xs">
        {WEEK_HEADER.map((d) => (
          <div key={d} className="bg-muted/30 px-2 py-1.5 text-center font-medium text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => <div key={`pad-${i}`} className="bg-background" />)}
        {month.days.map((d) => (
          <div
            key={d.dateKey}
            className={cn("min-h-[84px] space-y-1 bg-background p-1.5", d.isFuture && "opacity-50", d.isToday && "ring-1 ring-inset ring-foreground/30")}
          >
            <div className="flex items-center justify-between">
              <span className={cn("tabular-nums", d.isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>{Number(d.dateKey.slice(8))}</span>
              {d.dayKind === "WFH" && !d.status && !d.isFuture && <span className="text-[9px] text-muted-foreground">WFH day</span>}
            </div>
            {d.status && (
              <span className={cn("inline-block rounded border px-1 py-0.5 text-[10px] font-medium leading-none", STATUS_STYLES[d.status as AttendanceStatusValue])}>
                {ATTENDANCE_STATUS_LABELS[d.status as AttendanceStatusValue]}
              </span>
            )}
            {d.checkIn && (
              <p className="font-mono text-[10px] leading-tight text-muted-foreground tabular-nums">
                {d.checkIn}–{d.checkOut ?? (d.isToday ? "now" : "—")}
              </p>
            )}
            <DayFlags day={d} className="flex-col gap-y-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
