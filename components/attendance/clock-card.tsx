"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, LogIn, LogOut, MapPin, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AttendanceStatusBadge } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { clockInAction, clockOutAction } from "@/lib/actions/attendance.actions";
import { submitRequestAction } from "@/lib/actions/request.actions";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DAY_KIND_LABELS } from "@/lib/attendance/calendar";
import { formatDuration, type AttendanceStatusValue, type GeoPoint, to12h } from "@/lib/attendance/rules";
import type { getMyToday } from "@/lib/attendance/queries";
import { errorMessage } from "@/lib/utils";
import { UpdateDialog } from "@/components/updates/update-dialog";

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
  // Clock-in refused for location: show why, with a way to ask for WFH right here.
  const [blocked, setBlocked] = useState<string | null>(null);
  const [wfhOpen, setWfhOpen] = useState(false);
  // After clocking out, offer to add today's update (optional).
  const [updateOpen, setUpdateOpen] = useState(false);
  const [wfhReason, setWfhReason] = useState("");
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
        if (!res.success) {
          setBlocked(res.message);
          return;
        }
        setBlocked(null);
        if (res.message) toast.info(res.message);
        else toast.success(`Clocked in at ${res.time}`);
      } catch (err) {
        toast.error(errorMessage(err, "Clock-in failed. Try again."));
      }
    });
  };

  /** Ask for WFH for today, then clock in straight away (it waits for the approver). */
  const requestWfhAndClockIn = () => {
    startTransition(async () => {
      try {
        await submitRequestAction({ kind: "WFH", startDate: today.dateKey, endDate: today.dateKey, reason: wfhReason });
        setWfhOpen(false);
        setWfhReason("");
        const location = await readLocation(5_000);
        const res = await clockInAction({ location });
        if (!res.success) {
          setBlocked(res.message);
          return;
        }
        setBlocked(null);
        toast.success(res.message ?? `WFH requested and clocked in at ${res.time}`);
      } catch (err) {
        toast.error(errorMessage(err, "WFH not requested. Try again."));
      }
    });
  };

  const clockOut = async () => {
    const location = await readLocation(5_000);
    const res = await clockOutAction({ location });
    // Clocked out either way; a message is only a heads-up (e.g. counts as a half day).
    setUpdateOpen(true);
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
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
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
              In {to12h(record.checkIn)} · no clock-out recorded.{" "}
              <Link href={`/attendance?fix=${today.dateKey}`} className="font-medium text-foreground underline underline-offset-2">Fix attendance</Link>
            </span>
          ) : record?.checkIn ? (
            <>
              In {to12h(record.checkIn)}
              {record.checkOut ? ` · Out ${to12h(record.checkOut)} · ${formatDuration(record.workMinutes ?? 0)} worked` : ` · clock out before midnight`}
            </>
          ) : (
            <>
              {leaveText ? `${leaveText} · ` : ""}Office hours {to12h(office.workStart)}–{to12h(office.workEnd)}
              {!today.leave && ` · late after ${to12h(office.lateAfter)}`}
              {needsLocation && !today.flexibleWfh && !today.wfhPending && ` · within ${office.radiusMeters} m`}
            </>
          )}
        </p>
        {!record?.checkIn && needsLocation && (today.flexibleWfh || today.wfhPending) && (
          <p className="text-xs text-muted-foreground">
            {today.flexibleWfh
              ? "Flexible WFH: clock in from anywhere. At the office it records Present, elsewhere WFH."
              : "Your WFH request for today is waiting. You can clock in from home; it's confirmed when approved."}
          </p>
        )}
        {blocked && !isIn && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>{blocked}</span>
            {!today.wfhPending && (
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setWfhOpen(true)}>
                <Home className="h-3.5 w-3.5" /> Request WFH for Today
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={wfhOpen} onOpenChange={(o) => !isPending && setWfhOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Work From Home Today?</DialogTitle>
            <DialogDescription>
              This sends a WFH request for today and clocks you in now. Your approver confirms it; if they reject it, today is marked Absent.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); requestWfhAndClockIn(); }}>
            <Textarea autoFocus rows={3} aria-label="Reason" value={wfhReason} onChange={(e) => setWfhReason(e.target.value)} placeholder="Why? e.g. Couldn't reach the office, rain and traffic." disabled={isPending} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setWfhOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending || wfhReason.trim().length < 3}>{isPending ? "Sending…" : "Request and Clock In"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} dateKey={today.dateKey} />

      {fullDayLeave && !isIn ? null : isIn ? (
        <ConfirmAction
          trigger={<Button variant="outline" className="gap-2"><LogOut className="h-4 w-4" /> Clock Out</Button>}
          title="Clock out now?"
          description={`You clocked in at ${to12h(record?.checkIn)}. Office ends at ${to12h(office.workEnd)}; leaving earlier is marked as left early.`}
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
