import Link from "next/link";
import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue, to12h } from "@/lib/attendance/rules";
import { STATUS_STYLES } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { MonthNav } from "@/components/attendance/month-nav";
import type { getMonth } from "@/lib/attendance/queries";

type Month = Awaited<ReturnType<typeof getMonth>>;

const WEEK_HEADER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Month grid, Monday first, full width. Server component: no client JavaScript. */
export function MonthCalendar({ month, basePath }: { month: Month; basePath: string }) {
  const firstWeekday = (fromDateKey(month.days[0].dateKey).getUTCDay() + 6) % 7; // Monday = 0
  const count = (s: AttendanceStatusValue) => month.days.filter((d) => d.status === s).length;
  const worked = month.days.reduce((n, d) => n + (d.workMinutes ?? 0), 0);
  const overtime = month.days.reduce((n, d) => n + (d.overtimeMinutes ?? 0), 0);
  const currentMonth = month.today.slice(0, 7);

  const stats: { label: string; value: string | number; tone?: string }[] = [
    { label: "Present", value: count("PRESENT") },
    { label: "WFH", value: count("WFH") },
    { label: "Late", value: count("LATE"), tone: count("LATE") ? "text-amber-700 dark:text-amber-400" : undefined },
    { label: "Half Day", value: count("HALF_DAY"), tone: count("HALF_DAY") ? "text-orange-700 dark:text-orange-400" : undefined },
    { label: "On Leave", value: count("ON_LEAVE") },
    { label: "Absent", value: count("ABSENT"), tone: count("ABSENT") ? "text-red-700 dark:text-red-400" : undefined },
    { label: "Left Early", value: month.days.filter((d) => d.leftEarly).length },
    { label: "Missed Checkout", value: month.days.filter((d) => d.missedCheckout).length, tone: month.days.some((d) => d.missedCheckout) ? "text-red-700 dark:text-red-400" : undefined },
    { label: "Worked", value: formatDuration(worked) },
    { label: "Overtime", value: formatDuration(overtime), tone: overtime ? "text-emerald-700 dark:text-emerald-400" : undefined },
    { label: "Daily Updates", value: `${month.days.filter((d) => d.update === "ADDED").length} / ${month.days.filter((d) => d.update).length}` },
  ];

  return (
    <div className="space-y-6">
      <MonthNav monthKey={month.monthKey} currentMonth={currentMonth} href={(m) => (m ? `${basePath}?month=${m}` : basePath)} />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn("mt-1 text-xl font-semibold tabular-nums", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
          {WEEK_HEADER.map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="hidden md:inline">{d}</span>
              <span className="md:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/40">
          {Array.from({ length: firstWeekday }, (_, i) => <div key={`pad-${i}`} className="bg-muted/10" />)}
          {month.days.map((d) => (
            <div
              key={d.dateKey}
              className={cn(
                "flex min-h-[96px] flex-col gap-1.5 bg-background p-2 md:min-h-[128px] md:p-3",
                d.isFuture && "bg-muted/10 text-muted-foreground",
                d.isToday && "ring-2 ring-inset ring-foreground/20"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={cn("text-sm tabular-nums", d.isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {Number(d.dateKey.slice(8))}
                </span>
                {d.isToday && <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">Today</span>}
              </div>

              {d.status && (
                <span className={cn("w-fit rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight", STATUS_STYLES[d.status as AttendanceStatusValue])}>
                  {ATTENDANCE_STATUS_LABELS[d.status as AttendanceStatusValue]}
                </span>
              )}
              {d.leave?.typeName && <span className="truncate text-[11px] text-muted-foreground">{d.leave.typeName}{d.leave.halfDay ? " · half" : ""}</span>}
              {!d.status && d.dayKind === "WFH" && !d.isFuture && <span className="text-[11px] text-muted-foreground">WFH day</span>}

              {d.checkIn && (
                <p className="font-mono text-[11px] leading-tight text-muted-foreground tabular-nums">
                  {to12h(d.checkIn)} – {d.checkOut ? to12h(d.checkOut) : (d.isToday && !d.missedCheckout ? "now" : "—")}
                  {d.workMinutes ? <span className="hidden md:inline"> · {formatDuration(d.workMinutes)}</span> : null}
                </p>
              )}
              <DayFlags day={d} className="flex-col gap-y-0.5" />
              {d.update === "ADDED" && <span className="text-[11px] text-muted-foreground">Update added</span>}
              {d.update === "MISSING" && (
                <Link href={`/updates?view=mine&date=${d.dateKey}`} className="w-fit text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground" prefetch={false}>
                  Add update
                </Link>
              )}

              {d.missedCheckout && (
                <Link href={`${basePath}?month=${month.monthKey}&fix=${d.dateKey}`} className="mt-auto text-[11px] font-medium text-foreground underline underline-offset-2 hover:no-underline" prefetch={false}>
                  Correct time
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
