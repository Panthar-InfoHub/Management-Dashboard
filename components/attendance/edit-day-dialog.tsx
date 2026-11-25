"use client";
import { TimePicker } from "@/components/ui/time-picker";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { editAttendanceDayAction } from "@/lib/actions/attendance-admin.actions";
import { ATTENDANCE_STATUS_LABELS, EDITABLE_STATUSES, type EditableStatus } from "@/lib/attendance/rules";

/** Admin/HR: set one person's day (status + optional times) with a reason. */
export function EditDayButton({
  employeeId,
  name,
  date,
  dateLabel,
  current,
}: {
  employeeId: string;
  name: string;
  date: string;
  dateLabel: string;
  current: { status: string | null; checkIn: string | null; checkOut: string | null };
}) {
  const initialStatus = (EDITABLE_STATUSES as readonly string[]).includes(current.status ?? "") ? (current.status as EditableStatus) : "PRESENT";
  const [status, setStatus] = useState<EditableStatus>(initialStatus);
  const [checkIn, setCheckIn] = useState(current.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(current.checkOut ?? "");
  const [reason, setReason] = useState("");
  const absent = status === "ABSENT";

  return (
    <ConfirmAction
      trigger={
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" aria-label={`Edit ${name}'s day`}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      }
      title={`Edit ${name}'s day`}
      description={`${dateLabel}. ${name} is notified with your reason. Hours, left early and overtime are worked out from the times.`}
      confirmLabel="Save Day"
      pendingLabel="Saving…"
      onConfirm={async () => {
        const res = await editAttendanceDayAction({ employeeId, date, status, checkIn: absent ? null : checkIn || null, checkOut: absent ? null : checkOut || null, reason });
        setReason("");
        return `${res.name}'s ${res.day} saved as ${ATTENDANCE_STATUS_LABELS[status]}`;
      }}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as EditableStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDITABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{ATTENDANCE_STATUS_LABELS[s]}{s === "LATE" ? " (full day, arrived late)" : s === "PRESENT" ? " (full day)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!absent && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor={`in-${employeeId}`} className="text-xs font-semibold text-muted-foreground">Clock-In (optional)</label>
              <TimePicker id={`in-${employeeId}`} value={checkIn} onChange={setCheckIn} placeholder="Not set" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`out-${employeeId}`} className="text-xs font-semibold text-muted-foreground">Clock-Out (optional)</label>
              <TimePicker id={`out-${employeeId}`} value={checkOut} onChange={setCheckOut} placeholder="Not set" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor={`reason-${employeeId}`} className="text-xs font-semibold text-muted-foreground">Reason</label>
          <Textarea id={`reason-${employeeId}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client visit, approved by manager" />
        </div>
      </div>
    </ConfirmAction>
  );
}
