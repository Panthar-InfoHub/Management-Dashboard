"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RequestStatusBadge } from "@/components/leave/request-status-badge";
import { formatDay, formatRange, requestSummary } from "@/components/leave/format";
import { decideRequestAction, reviewAttendanceAction, undoDecisionAction } from "@/lib/actions/request.actions";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue, to12h } from "@/lib/attendance/rules";
import type { getInbox } from "@/lib/leave/queries";
import { cn } from "@/lib/utils";

type Inbox = NonNullable<Awaited<ReturnType<typeof getInbox>>>;
type PendingRequest = Inbox["requests"][number];
type Person = PendingRequest["employee"];

// ─── Building blocks ───

function Reason({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">“{text}”</p>;
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Textarea aria-label="Note (optional)" placeholder="Note for them (optional)" rows={2} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

/** One request: who · what · actions. Plain rows on the page, no boxes. */
function Row({ person, kind, children, actions }: { person: Person; kind: string; children: ReactNode; actions: ReactNode }) {
  return (
    <li className="grid gap-3 py-4 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:items-start lg:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar className="h-8 w-8" user={person} textClassName="text-[10px]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{person.name}</p>
          <p className="truncate text-xs text-muted-foreground">{kind}</p>
        </div>
      </div>
      <div className="min-w-0 space-y-1 text-sm">{children}</div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
    </li>
  );
}

function DecisionButtons({ id, who, what, canExcuse, lateHint }: { id: string; who: string; what: string; canExcuse?: boolean; lateHint?: string }) {
  const [note, setNote] = useState("");
  const [excuse, setExcuse] = useState(false);
  return (
    <>
      <ConfirmAction
        trigger={<Button size="sm" variant="outline" className="gap-1"><X className="h-3.5 w-3.5" /> Reject</Button>}
        title={`Reject ${who}'s request?`}
        description={what}
        confirmLabel="Reject Request"
        pendingLabel="Rejecting…"
        destructive
        onConfirm={async () => { await decideRequestAction(id, "REJECT", note); return `${who}'s request rejected`; }}
      >
        <NoteField value={note} onChange={setNote} />
      </ConfirmAction>
      <ConfirmAction
        trigger={<Button size="sm" className="gap-1"><Check className="h-3.5 w-3.5" /> Approve</Button>}
        title={`Approve ${who}'s request?`}
        description={what}
        confirmLabel="Approve Request"
        pendingLabel="Approving…"
        onConfirm={async () => { await decideRequestAction(id, "APPROVE", note, { excuseLate: canExcuse && excuse }); return `${who}'s request approved${canExcuse && excuse ? ", late excused" : ""}`; }}
      >
        {canExcuse && (
          <label className="flex items-start gap-3 rounded-lg border border-border/70 px-3 py-2.5 text-sm">
            <Switch checked={excuse} onCheckedChange={setExcuse} className="mt-0.5" />
            <span>
              <span className="font-medium">Excuse late arrival</span>
              <span className="block text-xs text-muted-foreground">{lateHint ?? "Clears the late mark on these days, including clock-ins after you approve. Kept on record as excused."}</span>
            </span>
          </label>
        )}
        <NoteField value={note} onChange={setNote} />
      </ConfirmAction>
    </>
  );
}

function ReviewButtons({ id, who, what, late }: { id: string; who: string; what: string; late: boolean }) {
  const [note, setNote] = useState("");
  return (
    <>
      <ConfirmAction
        trigger={<Button size="sm" variant="outline">Keep Half Day</Button>}
        title={`Keep ${who}'s day as a half day?`}
        description={`${what}. It counts as half a working day.`}
        confirmLabel="Keep Half Day"
        pendingLabel="Saving…"
        onConfirm={async () => { await reviewAttendanceAction(id, "KEEP_HALF_DAY", note); return `${who}'s day kept as a half day`; }}
      >
        <NoteField value={note} onChange={setNote} />
      </ConfirmAction>
      <ConfirmAction
        trigger={<Button size="sm">Make Full Day</Button>}
        title={`Count ${who}'s day as a full day?`}
        description={`${what}. It counts as a full working day${late ? " and stays marked Late, so it still shows in late counts" : ""}.`}
        confirmLabel="Make Full Day"
        pendingLabel="Saving…"
        onConfirm={async () => { await reviewAttendanceAction(id, "MAKE_FULL_DAY", note); return `${who}'s day counted as a full day`; }}
      >
        <NoteField value={note} onChange={setNote} />
      </ConfirmAction>
    </>
  );
}

/** Recorded → asked for, on one line, for an attendance fix. */
function FixComparison({ r }: { r: PendingRequest }) {
  const rec = r.recorded;
  const recordedText = !rec || (!rec.checkIn && !rec.status)
    ? "nothing recorded"
    : rec.checkIn
      ? `${to12h(rec.checkIn)} → ${rec.checkOut ? to12h(rec.checkOut) : "no clock-out"}`
      : ATTENDANCE_STATUS_LABELS[rec.status as AttendanceStatusValue] ?? "—";
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm">
      <span className="text-muted-foreground">Recorded <span className="font-mono tabular-nums">{recordedText}</span></span>
      {rec?.missedCheckout && <span className="text-xs text-red-600 dark:text-red-400">missed checkout</span>}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="font-mono font-medium tabular-nums">{to12h(r.fixCheckIn)} → {to12h(r.fixCheckOut)}</span>
      <span className="text-muted-foreground">{r.fixMinutes != null ? `${formatDuration(r.fixMinutes)} · ` : ""}{r.workMode === "WFH" ? "from home" : "at the office"}</span>
    </p>
  );
}

function UndoButton({ id, who, what, approvedLeave }: { id: string; who: string; what: string; approvedLeave: boolean }) {
  const [note, setNote] = useState("");
  return (
    <ConfirmAction
      trigger={<Button size="sm" variant="ghost" className="h-7 text-xs">Undo Decision</Button>}
      title={`Reopen ${who}'s request?`}
      description={`${what}. It goes back to Pending so it can be decided again${approvedLeave ? ", and the leave days return to their balance" : ""}. ${who} is told why.`}
      confirmLabel="Reopen Request"
      pendingLabel="Reopening…"
      onConfirm={async () => { await undoDecisionAction(id, note); setNote(""); return `${who}'s request is pending again`; }}
    >
      <Textarea aria-label="Reason" placeholder="Why are you undoing it? (required)" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
    </ConfirmAction>
  );
}

// ─── Inbox ───

type Kind = "ALL" | "LEAVE" | "WFH" | "ATTENDANCE_FIX" | "REVIEW";
const KIND_LABEL: Record<Exclude<Kind, "ALL">, string> = { LEAVE: "Leave", WFH: "Work from home", ATTENDANCE_FIX: "Attendance fix", REVIEW: "Half day review" };
const HINTS: Record<Kind, string> = {
  ALL: "Your own requests go to someone else.",
  LEAVE: "Approving takes the days from their balance. Sundays and holidays aren't counted.",
  WFH: "Approving makes those office days WFH, so clock-in won't need their location.",
  ATTENDANCE_FIX: "Approving writes the asked-for times; from-home days become WFH.",
  REVIEW: "Arrived after the late cut-off, or worked under the minimum hours.",
};

export function ApprovalsInbox({ inbox }: { inbox: Inbox }) {
  const [view, setView] = useState<"pending" | "decided">("pending");
  const [kind, setKind] = useState<Kind>("ALL");
  const counts: Record<Kind, number> = {
    ALL: inbox.requests.length + inbox.reviews.length,
    LEAVE: inbox.requests.filter((r) => r.kind === "LEAVE").length,
    WFH: inbox.requests.filter((r) => r.kind === "WFH").length,
    ATTENDANCE_FIX: inbox.requests.filter((r) => r.kind === "ATTENDANCE_FIX").length,
    REVIEW: inbox.reviews.length,
  };
  const requests = inbox.requests.filter((r) => kind === "ALL" || r.kind === kind);
  const reviews = kind === "ALL" || kind === "REVIEW" ? inbox.reviews : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        {view === "pending" ? (
          <div role="tablist" aria-label="Request type" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {(["ALL", "LEAVE", "WFH", "ATTENDANCE_FIX", "REVIEW"] as Kind[]).filter((k) => k === "ALL" || counts[k] > 0).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn("rounded py-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", kind === k ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {k === "ALL" ? "All" : KIND_LABEL[k]} <span className="tabular-nums text-muted-foreground">{counts[k]}</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">Your last decisions. Undo one to decide it again.</p>}
        <div role="radiogroup" aria-label="Show" className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {(["pending", "decided"] as const).map((v) => (
            <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {v === "pending" ? `Waiting · ${counts.ALL}` : "Decided"}
            </button>
          ))}
        </div>
      </div>

      {view === "pending" ? (
        <>
          <p className="text-xs text-muted-foreground">{HINTS[kind]}</p>
          {requests.length + reviews.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nothing waiting. New requests from your people show up here.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {requests.map((r) => r.kind === "ATTENDANCE_FIX" ? (
                <Row key={r.id} person={r.employee} kind={KIND_LABEL.ATTENDANCE_FIX} actions={<DecisionButtons id={r.id} who={r.employee.name} canExcuse lateHint="If the fixed clock-in is after the late cut-off, the day won't be marked late." what={`${formatDay(r.startDate)}: set to ${to12h(r.fixCheckIn)} → ${to12h(r.fixCheckOut)}, ${r.workMode === "WFH" ? "worked from home" : "at the office"}.`} />}>
                  <p className="font-medium">{formatDay(r.startDate)}</p>
                  <FixComparison r={r} />
                  <Reason text={r.reason} />
                </Row>
              ) : r.kind === "LEAVE" ? (
                <Row key={r.id} person={r.employee} kind={KIND_LABEL.LEAVE} actions={<DecisionButtons id={r.id} who={r.employee.name} what={`${formatRange(r.startDate, r.endDate)} · ${requestSummary(r)}`} />}>
                  <p>
                    <span className="font-medium">{formatRange(r.startDate, r.endDate)}</span>
                    <span className="text-muted-foreground"> · {r.leaveType ?? "Leave"} · <span className="tabular-nums">{r.days} day{r.days === 1 ? "" : "s"}</span>{r.halfDay && ` · ${r.halfDay === "FIRST_HALF" ? "first half" : "second half"}`}</span>
                  </p>
                  <Reason text={r.reason} />
                </Row>
              ) : (
                <Row
                  key={r.id}
                  person={r.employee}
                  kind={KIND_LABEL.WFH}
                  actions={<DecisionButtons
                    id={r.id}
                    who={r.employee.name}
                    canExcuse
                    lateHint={r.clockIns.some((c) => c.isLate) ? `They clocked in late (${r.clockIns.filter((c) => c.isLate).map((c) => to12h(c.checkIn)).join(", ")}). Turn on to clear the late mark.` : undefined}
                    what={`${formatRange(r.startDate, r.endDate)} · WFH.${r.clockIns.some((c) => c.awaiting) ? " Rejecting marks their home clock-ins as Absent." : ""}`}
                  />}
                >
                  <p><span className="font-medium">{formatRange(r.startDate, r.endDate)}</span><span className="text-muted-foreground tabular-nums"> · {r.days} office day{r.days === 1 ? "" : "s"}</span></p>
                  {r.clockIns.length > 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Already clocked in from home: {r.clockIns.map((c) => `${formatDay(c.date)} at ${to12h(c.checkIn)}${c.isLate ? " (late)" : ""}`).join(" · ")}
                    </p>
                  )}
                  <Reason text={r.reason} />
                </Row>
              ))}
              {reviews.map((a) => {
                const why = a.isLate ? `Arrived ${to12h(a.checkIn)}, after the late cut-off` : `Worked ${a.workMinutes != null ? formatDuration(a.workMinutes) : "under the minimum hours"}`;
                return (
                  <Row key={a.id} person={a.employee} kind={KIND_LABEL.REVIEW} actions={<ReviewButtons id={a.id} who={a.employee.name} late={a.isLate} what={`${formatDay(a.date)}: ${why.toLowerCase()}`} />}>
                    <p><span className="font-medium">{formatDay(a.date)}</span><span className="text-muted-foreground"> · {why}</span></p>
                    <p className="font-mono text-xs text-muted-foreground tabular-nums">In {a.checkIn ? to12h(a.checkIn) : "—"} · Out {a.checkOut ? to12h(a.checkOut) : "—"}{a.workMinutes != null ? ` · ${formatDuration(a.workMinutes)}` : ""}</p>
                  </Row>
                );
              })}
            </ul>
          )}
        </>
      ) : inbox.decided.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No decisions yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {inbox.decided.map((r) => (
            <li key={r.id} className="grid gap-3 py-3.5 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar className="h-8 w-8" user={r.employee} textClassName="text-[10px]" />
                <p className="truncate text-sm font-medium">{r.employee.name}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p><span className="font-medium">{formatRange(r.startDate, r.endDate)}</span> <span className="text-muted-foreground">· {requestSummary(r)}</span></p>
                <p className="text-xs text-muted-foreground">
                  By {r.decidedBy}{r.decidedAt ? ` on ${new Date(r.decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}{r.decisionNote ? ` · “${r.decisionNote}”` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 lg:justify-end">
                {!(r.kind === "ATTENDANCE_FIX" && r.status === "APPROVED") && (
                  <UndoButton id={r.id} who={r.employee.name} what={`${formatRange(r.startDate, r.endDate)} · ${requestSummary(r)}`} approvedLeave={r.kind === "LEAVE" && r.status === "APPROVED"} />
                )}
                <RequestStatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
