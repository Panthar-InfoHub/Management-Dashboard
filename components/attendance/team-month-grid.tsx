import Link from "next/link";
import { cn } from "@/lib/utils";
import { fromDateKey, WEEKDAYS } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue, to12h } from "@/lib/attendance/rules";
import { STATUS_STYLES } from "@/components/attendance/status-badge";
import type { getTeamMonth } from "@/lib/attendance/queries";
import { EditableDayCell } from "@/components/attendance/edit-day-dialog";

type TeamMonth = NonNullable<Awaited<ReturnType<typeof getTeamMonth>>>;
type Day = TeamMonth["people"][number]["days"][number];

/** Short cell code; the full status is always in the tooltip and the legend. */
const CODES: Record<AttendanceStatusValue, string> = {
  PRESENT: "P", LATE: "L", HALF_DAY: "½", ABSENT: "A", ON_LEAVE: "LV", WFH: "W", HOLIDAY: "H", WEEKLY_OFF: "–",
};

function tooltip(d: Day) {
  const date = fromDateKey(d.dateKey).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const parts = [date, d.status ? ATTENDANCE_STATUS_LABELS[d.status as AttendanceStatusValue] : d.isFuture ? "Upcoming" : "No record"];
  if (d.leave?.typeName) parts.push(d.leave.typeName + (d.leave.halfDay ? " (half)" : ""));
  if (d.checkIn) parts.push(`${to12h(d.checkIn)}–${d.checkOut ? to12h(d.checkOut) : (d.missedCheckout ? "no clock-out" : "…")}`);
  if (d.workMinutes) parts.push(`${formatDuration(d.workMinutes)} worked`);
  if (d.isLate) parts.push("late");
  if (d.leftEarly && d.earlyMinutes) parts.push(`left ${formatDuration(d.earlyMinutes)} early`);
  if (d.overtimeMinutes) parts.push(`+${formatDuration(d.overtimeMinutes)} overtime`);
  if (d.missedCheckout) parts.push("missed checkout");
  if (d.reviewPending) parts.push("pending review");
  if (d.awaitingWfh) parts.push("awaiting WFH approval");
  if (d.lateExcused) parts.push("late excused");
  if (d.update) parts.push(d.update === "ADDED" ? "daily update added" : "no daily update");
  return parts.join(" · ");
}

const TOTALS: AttendanceStatusValue[] = ["PRESENT", "WFH", "LATE", "HALF_DAY", "ON_LEAVE", "ABSENT"];

/** People × days for a month. Server-rendered; only editable cells load client code. */
export function TeamMonthGrid({ data }: { data: TeamMonth }) {
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Legend">
        {(Object.keys(CODES) as AttendanceStatusValue[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[10px] font-semibold", STATUS_STYLES[s])}>{CODES[s]}</span>
            {ATTENDANCE_STATUS_LABELS[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Missed checkout</li>
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Overtime</li>
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-foreground/50" /> Awaiting WFH or late excused</li>
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full border border-foreground/60" /> No daily update</li>
        {data.canEdit && <li className="text-foreground">Click a day to edit it</li>}
      </ul>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[200px] min-w-[180px] border-b border-border/40 bg-background px-3 py-2 text-left font-medium">Person</th>
              {data.dateKeys.map((k) => {
                const d = fromDateKey(k);
                return (
                  <th key={k} className={cn("min-w-[30px] border-b border-border/40 px-0.5 py-1 text-center font-normal", k === data.today && "bg-muted/40")}>
                    <Link href={`/attendance/today?date=${k}`} className="block rounded hover:bg-accent" title={`Open ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`} prefetch={false}>
                      <span className="block text-[9px] text-muted-foreground">{WEEKDAYS[d.getUTCDay()].charAt(0)}</span>
                      <span className="block tabular-nums">{d.getUTCDate()}</span>
                    </Link>
                  </th>
                );
              })}
              {TOTALS.map((s) => (
                <th key={s} className="border-b border-l border-border/40 px-2 py-1 text-center font-medium" title={ATTENDANCE_STATUS_LABELS[s]}>{CODES[s]}</th>
              ))}
              <th className="border-b border-border/40 px-2 py-1 text-center font-medium">OT</th>
              <th className="border-b border-border/40 px-2 py-1 text-center font-medium" title="Daily updates added, of days worked">Upd</th>
            </tr>
          </thead>
          <tbody>
            {data.people.length === 0 && (
              <tr><td colSpan={data.dateKeys.length + 9} className="px-3 py-6 text-center text-muted-foreground">No one here yet. Add people to the team to see them.</td></tr>
            )}
            {data.people.map(({ employee, days }) => {
              const counts = new Map<string, number>();
              let overtime = 0, worked = 0, added = 0;
              for (const d of days) {
                if (d.update) { worked++; if (d.update === "ADDED") added++; }
                if (d.status) counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
                overtime += d.overtimeMinutes ?? 0;
              }
              return (
                <tr key={employee.id} className="hover:bg-muted/20">
                  <td className="sticky left-0 z-10 border-b border-border/40 bg-background px-3 py-1.5">
                    <p className="truncate font-medium">{employee.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {employee.leftOn ? `Left ${fromDateKey(employee.leftOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}` : employee.team ?? employee.designation ?? "—"}
                    </p>
                  </td>
                  {days.map((d) => {
                    const cell = d.status ? (
                      <span className={cn("relative inline-flex h-7 w-full min-w-6 max-w-9 items-center justify-center rounded border px-0.5 text-[10px] font-semibold", STATUS_STYLES[d.status as AttendanceStatusValue])}>
                        {CODES[d.status as AttendanceStatusValue]}
                        {d.missedCheckout && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
                        {!d.missedCheckout && d.overtimeMinutes ? <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                        {(d.awaitingWfh || d.lateExcused) && <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-foreground/50" />}
                        {d.update === "MISSING" && <span className="absolute -bottom-0.5 -left-0.5 h-1.5 w-1.5 rounded-full border border-foreground/60 bg-background" />}
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center text-muted-foreground/40">·</span>
                    );
                    // Editable: admins/HR, not their own row, today or earlier, and not a full leave day.
                    const editable = data.canEdit && employee.id !== data.viewerId && !d.isFuture && !(d.leave && !d.leave.halfDay);
                    const dateLabel = fromDateKey(d.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
                    return (
                      <td key={d.dateKey} className={cn("border-b border-border/40 px-0.5 py-1.5 text-center", d.dateKey === data.today && "bg-muted/40")} title={tooltip(d) + (editable ? " · click to edit" : "")}>
                        {editable ? (
                          <EditableDayCell label={`Edit ${employee.name}, ${dateLabel}`} employeeId={employee.id} name={employee.name} date={d.dateKey} dateLabel={dateLabel} current={d} lateAfter={data.lateAfter}>
                            {cell}
                          </EditableDayCell>
                        ) : cell}
                      </td>
                    );
                  })}
                  {TOTALS.map((s) => (
                    <td key={s} className="border-b border-l border-border/40 px-2 text-center tabular-nums">{counts.get(s) ?? 0}</td>
                  ))}
                  <td className="border-b border-border/40 px-2 text-center tabular-nums">{overtime ? formatDuration(overtime) : "0"}</td>
                  <td className="border-b border-border/40 px-2 text-center tabular-nums" title={`${added} of ${worked} days worked have a daily update`}>{added}/{worked}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
