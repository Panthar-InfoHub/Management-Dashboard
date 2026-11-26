import { UserAvatar } from "@/components/ui/user-avatar";
import { AttendanceStatusBadge } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { EditDayButton } from "@/components/attendance/edit-day-dialog";
import { fromDateKey } from "@/lib/attendance/calendar";
import { DAY_KIND_LABELS } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue, to12h } from "@/lib/attendance/rules";
import type { getTodayBoard } from "@/lib/attendance/queries";

/** Daily update for a day worked, in words (not colour alone). */
function UpdateMark({ update }: { update: "ADDED" | "MISSING" | null }) {
  if (!update) return <span className="text-xs text-muted-foreground">—</span>;
  return update === "ADDED"
    ? <span className="text-xs font-medium">Added</span>
    : <span className="text-xs text-muted-foreground">Missing</span>;
}

type Board = NonNullable<Awaited<ReturnType<typeof getTodayBoard>>>;
type Row = Board["rows"][number];

// Who needs attention first: not in yet, then late, then everyone else.
function rank(r: Row) {
  if (!r.status) return r.dayKind === "OFFICE" || r.dayKind === "WFH" ? 0 : 4;
  if (r.status === "HALF_DAY" || r.status === "LATE") return 1;
  if (r.status === "ABSENT") return 0;
  return 2;
}

export function TodayBoard({ board }: { board: Board }) {
  const dateLabel = fromDateKey(board.dateKey).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const rows = [...board.rows].sort((a, b) => rank(a) - rank(b) || a.employee.name.localeCompare(b.employee.name));
  const notIn = board.isToday ? board.rows.filter((r) => !r.status && (r.dayKind === "OFFICE" || r.dayKind === "WFH")).length : 0;
  const counts = new Map<string, number>();
  for (const r of board.rows) if (r.status) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        <div className="rounded-xl border border-border/70 p-3 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
          <dt className="text-xs text-muted-foreground">{board.isToday ? "Not in yet" : "Absent"}</dt>
          <dd className="text-xl font-semibold tabular-nums">{board.isToday ? notIn : counts.get("ABSENT") ?? 0}</dd>
        </div>
        {(["PRESENT", "WFH", "LATE", "HALF_DAY", "ON_LEAVE"] as AttendanceStatusValue[]).map((s) => (
          <div key={s} className="rounded-xl border border-border/70 p-3 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
            <dt className="text-xs text-muted-foreground">{ATTENDANCE_STATUS_LABELS[s]}</dt>
            <dd className="text-xl font-semibold tabular-nums">{counts.get(s) ?? 0}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one to show. Add members to your team to see their attendance here.</p>
      ) : (
        <>
        {/* Phones: one line per person instead of a wide table. */}
        <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] sm:hidden">
          {rows.map((r) => (
            <li key={r.employee.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar className="h-8 w-8 shrink-0" user={r.employee} textClassName="text-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.employee.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  {!r.status && r.dayKind !== "OFFICE" && r.dayKind !== "WFH"
                    ? <span>{DAY_KIND_LABELS[r.dayKind]}</span>
                    : <AttendanceStatusBadge status={r.status as AttendanceStatusValue | null} />}
                  {r.checkIn && <span>{to12h(r.checkIn)} – {r.checkOut ? to12h(r.checkOut) : r.missedCheckout ? "no clock-out" : "still in"}</span>}
                  {r.workMinutes != null && <span>· {formatDuration(r.workMinutes)}</span>}
                  {r.update && <span>· Update {r.update === "ADDED" ? "added" : "missing"}</span>}
                </p>
                <DayFlags day={r} className="mt-1" />
              </div>
              {board.canEdit && r.employee.id !== board.viewerId && !(r.leave && !r.leave.halfDay) && (
                <EditDayButton employeeId={r.employee.id} name={r.employee.name} date={board.dateKey} dateLabel={dateLabel} current={r} lateAfter={board.lateAfter} />
              )}
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">In</th>
                <th className="px-4 py-2 font-medium">Out</th>
                <th className="px-4 py-2 font-medium">Worked</th>
                <th className="px-4 py-2 font-medium">Daily Update</th>
                {board.canEdit && <th className="px-4 py-2"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee.id} className="border-t border-border/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar className="h-7 w-7" user={r.employee} textClassName="text-[10px]" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.employee.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{[r.employee.designation, r.employee.team].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {!r.status && r.dayKind !== "OFFICE" && r.dayKind !== "WFH"
                      ? <span className="text-xs text-muted-foreground">{DAY_KIND_LABELS[r.dayKind]}</span>
                      : <AttendanceStatusBadge status={r.status as AttendanceStatusValue | null} />}
                    <DayFlags day={r} className="ml-2" />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.checkIn ? to12h(r.checkIn) : "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.checkOut ? to12h(r.checkOut) : (r.checkIn && !r.missedCheckout ? "still in" : "—")}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.workMinutes != null ? formatDuration(r.workMinutes) : "—"}</td>
                  <td className="px-4 py-2.5"><UpdateMark update={r.update} /></td>
                  {board.canEdit && (
                    <td className="px-2 py-2.5 text-right">
                      {r.employee.id !== board.viewerId && !(r.leave && !r.leave.halfDay) && (
                        <EditDayButton employeeId={r.employee.id} name={r.employee.name} date={board.dateKey} dateLabel={dateLabel} current={r} lateAfter={board.lateAfter} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
