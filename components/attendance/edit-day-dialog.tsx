"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttendanceStatusBadge } from "@/components/attendance/status-badge";
import { DayFlags } from "@/components/attendance/day-flags";
import { editAttendanceDayAction } from "@/lib/actions/attendance-admin.actions";
import { ATTENDANCE_STATUS_LABELS, EDITABLE_STATUSES, type AttendanceStatusValue, type EditableStatus, to12h, lastOnTime } from "@/lib/attendance/rules";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** What the day holds right now, shown above the form. */
export type DayNow = {
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  isLate?: boolean;
  missedCheckout?: boolean;
  leftEarly?: boolean;
  earlyMinutes?: number | null;
  overtimeMinutes?: number | null;
  reviewPending?: boolean;
  awaitingWfh?: boolean;
  lateExcused?: boolean;
};

const HINT: Record<EditableStatus, string> = {
  PRESENT: "Full day at the office, on time. A late clock-in is kept as excused.",
  LATE: "Full day at the office, arrived late.",
  HALF_DAY: "Counts as half a day.",
  WFH: "Worked from home. Late after the cut-off unless you excuse it.",
  ABSENT: "Didn't work. Times are cleared.",
};

/**
 * Admin/HR: set one person's day: status, times and late, with a reason they see.
 * Controlled, so a grid cell or a row button can open it.
 */
export function EditDayDialog({
  open,
  onOpenChange,
  employeeId,
  name,
  date,
  dateLabel,
  current,
  lateAfter,
  graceMinutes = 0,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  name: string;
  date: string;
  dateLabel: string;
  current: DayNow;
  /** The office late cut-off ("11:00"), to say when a time counts as late. */
  lateAfter?: string;
  /** Office grace after the cut-off: a clock-in within it isn't late. */
  graceMinutes?: number;
}) {
  const initial = (EDITABLE_STATUSES as readonly string[]).includes(current.status ?? "") ? (current.status as EditableStatus) : "PRESENT";
  const [status, setStatus] = useState<EditableStatus>(initial);
  const [checkIn, setCheckIn] = useState(current.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(current.checkOut ?? "");
  const [excuse, setExcuse] = useState(!!current.lateExcused);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const absent = status === "ABSENT";
  const lateTime = !!lateAfter && !!checkIn && checkIn > lastOnTime(lateAfter, graceMinutes);

  const save = () => startTransition(async () => {
    try {
      const res = await editAttendanceDayAction({
        employeeId, date, status, reason,
        checkIn: absent ? null : checkIn || null,
        checkOut: absent ? null : checkOut || null,
        excuseLate: status === "WFH" && excuse,
      });
      toast.success(`${res.name}'s ${res.day} saved as ${ATTENDANCE_STATUS_LABELS[status]}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Day not saved. Try again."));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Edit {name}&apos;s Day</DialogTitle>
          <DialogDescription>{dateLabel}. {name} is notified with your reason, and it&apos;s in the Audit log.</DialogDescription>
        </DialogHeader>

        <form id={`edit-day-${employeeId}-${date}`} className="flex-1 space-y-5 overflow-y-auto px-6 py-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Now</span>
            {current.status ? <AttendanceStatusBadge status={current.status as AttendanceStatusValue} /> : <span>No record</span>}
            {(current.checkIn || current.checkOut) && (
              <span className="font-mono tabular-nums text-muted-foreground">{current.checkIn ? to12h(current.checkIn) : "—"} → {current.checkOut ? to12h(current.checkOut) : "—"}</span>
            )}
            <DayFlags day={{ isLate: false, missedCheckout: false, leftEarly: false, earlyMinutes: null, overtimeMinutes: null, reviewPending: false, ...current }} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-5 gap-1 rounded-lg border border-border p-1">
              {EDITABLE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  disabled={isPending}
                  className={cn(
                    "rounded-md px-1 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    status === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {ATTENDANCE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{HINT[status]}</p>
          </div>

          {!absent && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`in-${employeeId}-${date}`}>Clock-In</Label>
                <TimePicker id={`in-${employeeId}-${date}`} value={checkIn} onChange={setCheckIn} placeholder="Not set" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`out-${employeeId}-${date}`}>Clock-Out</Label>
                <TimePicker id={`out-${employeeId}-${date}`} value={checkOut} onChange={setCheckOut} placeholder="Not set" />
              </div>
              {lateTime && (
                <p className="col-span-2 -mt-1 text-xs text-muted-foreground">After the {to12h(lateAfter)} cut-off, so it counts as a late arrival.</p>
              )}
            </div>
          )}

          {status === "WFH" && lateTime && (
            <label className="flex items-start gap-3 rounded-lg border border-border/70 px-3 py-2.5 text-sm">
              <Switch checked={excuse} onCheckedChange={setExcuse} className="mt-0.5" disabled={isPending} />
              <span>
                <span className="font-medium">Excuse late arrival</span>
                <span className="block text-xs text-muted-foreground">No late mark; recorded as “Late excused”.</span>
              </span>
            </label>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`reason-${employeeId}-${date}`}>Reason</Label>
            <Textarea id={`reason-${employeeId}-${date}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client visit, approved by manager" disabled={isPending} />
          </div>
        </form>

        <DialogFooter className="m-0 rounded-b-xl border-t border-border/60 px-6 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button type="submit" form={`edit-day-${employeeId}-${date}`} disabled={isPending || reason.trim().length < 3}>{isPending ? "Saving…" : "Save Day"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Row button (Team Day list) that opens the dialog. */
export function EditDayButton(props: Omit<Parameters<typeof EditDayDialog>[0], "open" | "onOpenChange">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" aria-label={`Edit ${props.name}'s day`} onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" /> Edit
      </Button>
      {open && <EditDayDialog {...props} open onOpenChange={setOpen} />}
    </>
  );
}

/** A grid cell that opens the dialog when clicked (admins and HR). */
export function EditableDayCell({ children, label, ...props }: Omit<Parameters<typeof EditDayDialog>[0], "open" | "onOpenChange"> & { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className="block w-full rounded hover:ring-2 hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none">
        {children}
      </button>
      {open && <EditDayDialog {...props} open onOpenChange={setOpen} />}
    </>
  );
}
