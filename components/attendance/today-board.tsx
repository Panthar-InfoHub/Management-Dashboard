import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AttendanceStatusBadge } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { DAY_KIND_LABELS } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue } from "@/lib/attendance/rules";
import type { getTodayBoard } from "@/lib/attendance/queries";

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
  const rows = [...board.rows].sort((a, b) => rank(a) - rank(b) || a.employee.name.localeCompare(b.employee.name));
  const notIn = board.rows.filter((r) => !r.status && (r.dayKind === "OFFICE" || r.dayKind === "WFH")).length;
  const counts = new Map<string, number>();
  for (const r of board.rows) if (r.status) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-lg border border-border/40 p-3">
          <dt className="text-xs text-muted-foreground">Not in yet</dt>
          <dd className="text-xl font-semibold tabular-nums">{notIn}</dd>
        </div>
        {(["PRESENT", "WFH", "LATE", "HALF_DAY", "ON_LEAVE"] as AttendanceStatusValue[]).map((s) => (
          <div key={s} className="rounded-lg border border-border/40 p-3">
            <dt className="text-xs text-muted-foreground">{ATTENDANCE_STATUS_LABELS[s]}</dt>
            <dd className="text-xl font-semibold tabular-nums">{counts.get(s) ?? 0}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one to show. Add members to your team to see their attendance here.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">In</th>
                <th className="px-4 py-2 font-medium">Out</th>
                <th className="px-4 py-2 font-medium">Worked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee.id} className="border-t border-border/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7">
                        {r.employee.avatarUrl && <AvatarImage src={r.employee.avatarUrl} alt="" />}
                        <AvatarFallback className="text-[10px]">{r.employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
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
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.checkIn ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.checkOut ?? (r.checkIn && !r.missedCheckout ? "still in" : "—")}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.workMinutes != null ? formatDuration(r.workMinutes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
