"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Clock, LogIn, LogOut, MapPin, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AttendanceStatusBadge } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { clockInAction, clockOutAction } from "@/lib/actions/attendance.actions";
import { DAY_KIND_LABELS } from "@/lib/attendance/calendar";
import { formatDuration, type AttendanceStatusValue, type GeoPoint } from "@/lib/attendance/rules";
import type { getMyToday } from "@/lib/attendance/queries";
import { errorMessage } from "@/lib/utils";

type Today = NonNullable<Awaited<ReturnType<typeof getMyToday>>>;

function readLocation(timeoutMs: number): Promise<GeoPoint | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    );
  });
}

export function ClockCard({ today }: { today: Today }) {
  const [isPending, startTransition] = useTransition();
  const { record, office } = today;
  const needsLocation = today.dayKind === "OFFICE";
  const isIn = !!record?.checkIn && !record.checkOut;
  const fullDayLeave = !!today.leave && !today.leave.halfDay;
  const leaveText = today.leave
    ? `${today.leave.halfDay ? (today.leave.halfDay === "FIRST_HALF" ? "First-half " : "Second-half ") : ""}${today.leave.typeName ?? "Leave"} today`
    : null;

  const clockIn = () => {
    startTransition(async () => {
      try {
        const location = await readLocation(needsLocation ? 15_000 : 5_000);
        const res = await clockInAction({ location });
        if (res.message) toast.info(res.message);
        else toast.success(`Clocked in at ${res.time}`);
      } catch (err) {
        toast.error(errorMessage(err, "Clock-in failed. Try again."));
      }
    });
  };

  const clockOut = async () => {
    const location = await readLocation(5_000);
    const res = await clockOutAction({ location });
    if (res.message) {
      toast.warning(res.message);
      return;
    }
    const extra = res.earlyMinutes
      ? ` · left ${formatDuration(res.earlyMinutes)} early`
      : res.overtimeMinutes
        ? ` · ${formatDuration(res.overtimeMinutes)} overtime`
        : "";
    return `Clocked out at ${res.time} · ${formatDuration(res.workMinutes)} worked${extra}`;
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {today.dayKind === "WFH" ? <Home className="h-4 w-4 text-muted-foreground" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
          {DAY_KIND_LABELS[today.dayKind]}
          {today.dayKind === "OFFICE" && <span className="font-normal text-muted-foreground">· {office.name}</span>}
          {record && <AttendanceStatusBadge status={record.status as AttendanceStatusValue} />}
          {record && <DayFlags day={record} />}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <Clock className="h-3.5 w-3.5" />
          {fullDayLeave ? (
            <>On {leaveText}. Enjoy the day off.</>
          ) : record?.missedCheckout ? (
            <span>
              In {record.checkIn} · no clock-out recorded.{" "}
              <Link href={`/attendance?fix=${today.dateKey}`} className="font-medium text-foreground underline underline-offset-2">Fix attendance</Link>
            </span>
          ) : record?.checkIn ? (
            <>
              In {record.checkIn}
              {record.checkOut ? ` · Out ${record.checkOut} · ${formatDuration(record.workMinutes ?? 0)} worked` : ` · clock out before midnight`}
            </>
          ) : (
            <>
              {leaveText ? `${leaveText} · ` : ""}Office hours {office.workStart}–{office.workEnd}
              {!today.leave && ` · late after ${office.lateAfter}`}
              {needsLocation && ` · within ${office.radiusMeters} m`}
            </>
          )}
        </p>
      </div>

      {fullDayLeave && !isIn ? null : isIn ? (
        <ConfirmAction
          trigger={<Button variant="outline" className="gap-2"><LogOut className="h-4 w-4" /> Clock Out</Button>}
          title="Clock out now?"
          description={`You clocked in at ${record?.checkIn}. Office ends at ${office.workEnd}; leaving earlier is marked as left early.`}
          confirmLabel="Clock Out"
          pendingLabel="Clocking out…"
          onConfirm={clockOut}
        />
      ) : (
        <Button onClick={clockIn} disabled={isPending} className="gap-2">
          <LogIn className="h-4 w-4" />
          {isPending ? (needsLocation ? "Checking location…" : "Clocking in…") : record?.checkOut ? "Clock In Again" : "Clock In"}
        </Button>
      )}
    </div>
  );
}
