"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Home, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitRequestAction } from "@/lib/actions/request.actions";
import { REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";
import { errorMessage } from "@/lib/utils";

type LeaveOption = { leaveTypeId: string; name: string; unlimited: boolean; available: number | null };

const EMPTY = { leaveTypeId: "", startDate: "", endDate: "", dayPart: "FULL", reason: "", fixCheckIn: "", fixCheckOut: "" };

const TRIGGERS: Record<RequestKindValue, { label: string; title: string; icon: typeof Plus }> = {
  LEAVE: { label: "Apply for Leave", title: "Apply for Leave", icon: Plus },
  WFH: { label: "Request WFH", title: "Request Work From Home", icon: Home },
  ATTENDANCE_FIX: { label: "Fix Attendance", title: "Fix Attendance", icon: CalendarCheck },
};

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
}: {
  leaveTypes?: LeaveOption[];
  today: string;
  kind?: RequestKindValue;
  defaultDate?: string;
  defaultOpen?: boolean;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<RequestKindValue>(fixedKind ?? "LEAVE");
  const trigger = fixedKind ? TRIGGERS[fixedKind] : { label: "New Request", title: "New Request", icon: Plus };
  const [form, setForm] = useState({ ...EMPTY, leaveTypeId: leaveTypes[0]?.leaveTypeId ?? "", startDate: defaultDate ?? "", endDate: defaultDate ?? "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const selectedType = leaveTypes.find((t) => t.leaveTypeId === form.leaveTypeId);
  const single = kind === "ATTENDANCE_FIX" || form.dayPart !== "FULL";

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
          fixCheckOut: kind === "ATTENDANCE_FIX" ? form.fixCheckOut : null,
        });
        toast.success(kind === "ATTENDANCE_FIX" ? "Attendance fix sent for approval" : `${REQUEST_KIND_LABELS[kind]} request sent · ${res.days} day${res.days === 1 ? "" : "s"}`);
        setOpen(false);
        setForm({ ...EMPTY, leaveTypeId: leaveTypes[0]?.leaveTypeId ?? "" });
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
          {kind === "ATTENDANCE_FIX" && (
            <p className="text-xs text-muted-foreground">For a day you forgot to clock out, or clocked the wrong time. Enter the real times; an approver checks them.</p>
          )}
          {kind === "WFH" && (
            <p className="text-xs text-muted-foreground">Once approved, those office days are WFH for you and clock-in won&apos;t need your location.</p>
          )}
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
              <Input
                id="req-start" type="date" required value={form.startDate} disabled={isPending}
                max={kind === "ATTENDANCE_FIX" ? today : undefined}
                onChange={(e) => set({ startDate: e.target.value, endDate: form.endDate && form.endDate >= e.target.value ? form.endDate : e.target.value })}
              />
            </div>
            {!single && (
              <div className="space-y-1.5">
                <label htmlFor="req-end" className="text-xs font-semibold text-muted-foreground">To</label>
                <Input id="req-end" type="date" required value={form.endDate} min={form.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} disabled={isPending} />
              </div>
            )}
          </div>

          {kind === "ATTENDANCE_FIX" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="req-in" className="text-xs font-semibold text-muted-foreground">Clock-In Time</label>
                <Input id="req-in" type="time" required value={form.fixCheckIn} onChange={(e) => set({ fixCheckIn: e.target.value })} disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="req-out" className="text-xs font-semibold text-muted-foreground">Clock-Out Time</label>
                <Input id="req-out" type="time" required value={form.fixCheckOut} onChange={(e) => set({ fixCheckOut: e.target.value })} disabled={isPending} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="req-reason" className="text-xs font-semibold text-muted-foreground">Reason</label>
            <Textarea id="req-reason" rows={3} maxLength={1000} required value={form.reason} onChange={(e) => set({ reason: e.target.value })} disabled={isPending}
              placeholder={kind === "ATTENDANCE_FIX" ? "e.g. Forgot to clock out" : kind === "WFH" ? "e.g. Waiting for a delivery" : "e.g. Family function"} />
          </div>

          {kind === "LEAVE" && selectedType && !selectedType.unlimited && (
            <p className="text-xs text-muted-foreground">{selectedType.available} {selectedType.name} day{selectedType.available === 1 ? "" : "s"} available. Sundays and holidays aren&apos;t counted.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.startDate || form.reason.trim().length < 3}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {isPending ? "Sending…" : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
