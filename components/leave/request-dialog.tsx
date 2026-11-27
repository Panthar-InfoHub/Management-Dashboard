"use client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TimePicker } from "@/components/ui/time-picker";
import { lastOnTime, to12h } from "@/lib/attendance/rules";
import { DatePicker } from "@/components/ui/date-picker";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarCheck, Clock, Home, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyFixDayAction, submitRequestAction } from "@/lib/actions/request.actions";
import { REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";
import { errorMessage } from "@/lib/utils";

type LeaveOption = { leaveTypeId: string; name: string; unlimited: boolean; available: number | null };

const EMPTY = { leaveTypeId: "", startDate: "", endDate: "", dayPart: "FULL", reason: "", fixCheckIn: "", fixCheckOut: "", workMode: "OFFICE", arriveBy: "" };

const TRIGGERS: Record<RequestKindValue, { label: string; title: string; icon: typeof Plus }> = {
  LEAVE: { label: "Apply for Leave", title: "Apply for Leave", icon: Plus },
  WFH: { label: "Request WFH", title: "Request Work From Home", icon: Home },
  ATTENDANCE_FIX: { label: "Correct My Time", title: "Correct My Time", icon: CalendarCheck },
  LATE_ARRIVAL: { label: "Late Arrival", title: "Request Late Arrival", icon: Clock },
};

/** "2026-11-27" moved by n days. */
function shiftDay(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** How far before or after the day a fix or late arrival can be asked for. */
const REQUEST_WINDOW_DAYS = 31;

/** What each request is for, in plain words, at the top of the form. */
const EXPLAIN = {
  ATTENDANCE_FIX: {
    when: ["You forgot to clock in or clock out.", "The time on your day is wrong."],
    then: "Enter the right time. Your manager checks it and decides how the day counts.",
    other: "Not working that day? Apply for leave instead.",
  },
  LATE_ARRIVAL: {
    when: ["You came late today, or on an earlier day.", "You know you will be late on a coming day."],
    then: "If your manager approves, the day is not a half day. Your clock-in time stays the same.",
    other: "Is the time itself wrong? Use Correct My Time instead.",
  },
  WFH: {
    when: ["You need to work from home on an office day."],
    then: "Once approved, you can clock in from home on those days.",
    other: null,
  },
} as const;

function Explainer({ when, then, other }: { when: readonly string[]; then: string; other: string | null }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
      <p className="font-medium">Use this when:</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {when.map((w) => <li key={w}>{w}</li>)}
      </ul>
      <p>{then}</p>
      {other && <p className="text-muted-foreground">{other}</p>}
    </div>
  );
}

/**
 * One form for every request kind. Pass `kind` to fix it to one (Leave page:
 * leave only; Attendance page: WFH or fix), so nobody has to choose a type.
 */
export function RequestDialog({
  leaveTypes = [],
  today,
  kind: fixedKind,
  defaultDate,
  defaultOpen = false,
  variant = "default",
  lateAfter,
  graceMinutes,
}: {
  leaveTypes?: LeaveOption[];
  today: string;
  kind?: RequestKindValue;
  defaultDate?: string;
  defaultOpen?: boolean;
  variant?: "default" | "outline";
  /** Office late cut-off ("HH:mm"), to warn when a fixed clock-in is after it. */
  lateAfter?: string;
  /** Office late-arrival grace, shown next to "I'll arrive by". */
  graceMinutes?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<RequestKindValue>(fixedKind ?? "LEAVE");
  const trigger = fixedKind ? TRIGGERS[fixedKind] : { label: "New Request", title: "New Request", icon: Plus };
  const [form, setForm] = useState({ ...EMPTY, leaveTypeId: leaveTypes[0]?.leaveTypeId ?? "", startDate: defaultDate ?? "", endDate: defaultDate ?? "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const selectedType = leaveTypes.find((t) => t.leaveTypeId === form.leaveTypeId);
  const single = kind === "ATTENDANCE_FIX" || kind === "LATE_ARRIVAL" || form.dayPart !== "FULL";

  // Attendance fix: start from what's recorded for the day, so only the wrong time changes.
  type Recorded = Awaited<ReturnType<typeof getMyFixDayAction>>;
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const loadToken = useRef(0);
  const isFix = kind === "ATTENDANCE_FIX";
  const isLateArrival = kind === "LATE_ARRIVAL";
  // A late arrival only needs the recorded day for today or earlier.
  const dayToLoad = open && form.startDate && (isFix || (isLateArrival && form.startDate <= today)) ? form.startDate : "";
  useEffect(() => {
    if (!dayToLoad) return;
    const token = ++loadToken.current;
    getMyFixDayAction(dayToLoad).then((day) => {
      if (token !== loadToken.current) return;
      setRecorded(day);
      if (isFix) setForm((f) => ({ ...f, fixCheckIn: day.checkIn ?? "", fixCheckOut: day.checkOut ?? "", workMode: day.workMode }));
    }).catch(() => token === loadToken.current && setRecorded(null));
  }, [dayToLoad, isFix]);
  // Asking before clocking in (a later day, or today not clocked in yet): say when you'll arrive.
  const needsArriveBy = isLateArrival && !!form.startDate && (form.startDate > today || (recorded !== null && !recorded.checkIn));
  // Today's clock-out is optional: they may still be working.
  const checkOutOptional = isFix && form.startDate === today;

  const submit = () => {
    startTransition(async () => {
      try {
        const res = await submitRequestAction({
          kind,
          leaveTypeId: kind === "LEAVE" ? form.leaveTypeId : null,
          startDate: form.startDate,
          endDate: single ? form.startDate : form.endDate || form.startDate,
          halfDay: kind === "LEAVE" && form.dayPart !== "FULL" ? (form.dayPart as "FIRST_HALF" | "SECOND_HALF") : null,
          reason: form.reason,
          fixCheckIn: kind === "ATTENDANCE_FIX" ? form.fixCheckIn : null,
          fixCheckOut: kind === "ATTENDANCE_FIX" ? form.fixCheckOut || null : null,
          workMode: kind === "ATTENDANCE_FIX" ? (form.workMode as "OFFICE" | "WFH") : null,
          arriveBy: needsArriveBy ? form.arriveBy : null,
        });
        toast.success(kind === "ATTENDANCE_FIX" ? "Time correction sent for approval" : kind === "LATE_ARRIVAL" ? "Late arrival request sent" : `${REQUEST_KIND_LABELS[kind]} request sent · ${res.days} day${res.days === 1 ? "" : "s"}`);
        setOpen(false);
        setForm({ ...EMPTY, leaveTypeId: leaveTypes[0]?.leaveTypeId ?? "" });
        setRecorded(null);
        // Drop ?fix=… so a refresh doesn't open the form again.
        if (defaultOpen) {
          const url = new URL(window.location.href);
          url.searchParams.delete("fix");
          window.history.replaceState(null, "", url);
        }
      } catch (err) {
        toast.error(errorMessage(err, "Request not sent. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className="gap-2"><trigger.icon className="h-4 w-4" /> {trigger.label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{trigger.title}</DialogTitle></DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {kind in EXPLAIN && <Explainer {...EXPLAIN[kind as keyof typeof EXPLAIN]} />}
          <div className={fixedKind ? "hidden" : "space-y-1.5"}>
            <label className="text-xs font-semibold text-muted-foreground">Request</label>
            <Select value={kind} onValueChange={(v) => setKind(v as RequestKindValue)} disabled={isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REQUEST_KIND_LABELS) as RequestKindValue[]).map((k) => <SelectItem key={k} value={k}>{REQUEST_KIND_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {kind === "LEAVE" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Leave Type</label>
                <Select value={form.leaveTypeId} onValueChange={(v) => set({ leaveTypeId: v })} disabled={isPending}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.leaveTypeId} value={t.leaveTypeId}>
                        {t.name}{t.unlimited ? "" : ` · ${t.available} left`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Day</label>
                <Select value={form.dayPart} onValueChange={(v) => set({ dayPart: v })} disabled={isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full day(s)</SelectItem>
                    <SelectItem value="FIRST_HALF">First half</SelectItem>
                    <SelectItem value="SECOND_HALF">Second half</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="req-start" className="text-xs font-semibold text-muted-foreground">{single ? "Date" : "From"}</label>
              <DatePicker
                id="req-start" value={form.startDate} disabled={isPending}
                min={kind === "ATTENDANCE_FIX" || kind === "LATE_ARRIVAL" ? shiftDay(today, -REQUEST_WINDOW_DAYS) : undefined}
                max={kind === "ATTENDANCE_FIX" ? today : kind === "LATE_ARRIVAL" ? shiftDay(today, REQUEST_WINDOW_DAYS) : undefined}
                onChange={(v) => set({ startDate: v, endDate: form.endDate && form.endDate >= v ? form.endDate : v })}
              />
            </div>
            {!single && (
              <div className="space-y-1.5">
                <label htmlFor="req-end" className="text-xs font-semibold text-muted-foreground">To</label>
                <DatePicker id="req-end" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set({ endDate: v })} disabled={isPending} />
              </div>
            )}
          </div>

          {kind === "ATTENDANCE_FIX" && (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-muted-foreground">Where Did You Work?</legend>
              <RadioGroup className="grid-cols-2 gap-2" value={form.workMode} onValueChange={(v) => set({ workMode: v as "OFFICE" | "WFH" })} disabled={isPending}>
                {([["OFFICE", "At the office"], ["WFH", "From home"]] as const).map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${form.workMode === value ? "border-foreground" : "border-border/60"}`}>
                    <RadioGroupItem value={value} />
                    {label}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          )}

          {kind === "ATTENDANCE_FIX" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {recorded && form.startDate && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Recorded:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {recorded.checkIn
                      ? `${to12h(recorded.checkIn)} → ${recorded.checkOut ? to12h(recorded.checkOut) : recorded.stillClockedIn ? "still clocked in" : "no clock-out"}`
                      : "no clock-in"}
                  </span>
                </p>
              )}
              <div className="space-y-1.5">
                <label htmlFor="req-in" className="text-xs font-semibold text-muted-foreground">Clock-In Time</label>
                <TimePicker id="req-in" value={form.fixCheckIn} onChange={(v) => set({ fixCheckIn: v })} disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="req-out" className="text-xs font-semibold text-muted-foreground">Clock-Out Time{checkOutOptional && " (Optional)"}</label>
                <TimePicker id="req-out" value={form.fixCheckOut} onChange={(v) => set({ fixCheckOut: v })} disabled={isPending} />
              </div>
              {checkOutOptional && !form.fixCheckOut && (
                <p className="text-xs text-muted-foreground sm:col-span-2">Still working? Leave the clock-out empty and clock out as usual when you leave.</p>
              )}
              {lateAfter && form.fixCheckIn && form.fixCheckIn > lastOnTime(lateAfter, graceMinutes ?? 0) && (
                <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-400">
                  {to12h(form.fixCheckIn)} is after the {to12h(lateAfter)} cut-off, so it counts as a late arrival. Your approver decides whether the day is Present, Late or Half Day. If you arrived earlier, enter that time.
                </p>
              )}
            </div>
          )}

          {needsArriveBy && (
            <div className="space-y-1.5">
              <label htmlFor="req-arrive" className="text-xs font-semibold text-muted-foreground">I&apos;ll Arrive By</label>
              <TimePicker id="req-arrive" value={form.arriveBy} onChange={(v) => set({ arriveBy: v })} disabled={isPending} />
              <p className="text-xs text-muted-foreground">Clock in by this time. If you come later, the day counts as a half day.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="req-reason" className="text-xs font-semibold text-muted-foreground">Reason</label>
            <Textarea id="req-reason" rows={3} maxLength={1000} required value={form.reason} onChange={(e) => set({ reason: e.target.value })} disabled={isPending}
              placeholder={kind === "ATTENDANCE_FIX" ? "e.g. Forgot to clock out" : kind === "LATE_ARRIVAL" ? "e.g. Doctor's appointment in the morning" : kind === "WFH" ? "e.g. Waiting for a delivery" : "e.g. Family function"} />
          </div>

          {kind === "LEAVE" && selectedType && !selectedType.unlimited && (
            <p className="text-xs text-muted-foreground">{selectedType.available} {selectedType.name} day{selectedType.available === 1 ? "" : "s"} available. Sundays and holidays aren&apos;t counted.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.startDate || (kind === "ATTENDANCE_FIX" && (!form.fixCheckIn || (!form.fixCheckOut && !checkOutOptional))) || (needsArriveBy && !form.arriveBy) || form.reason.trim().length < 3}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {isPending ? "Sending…" : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
