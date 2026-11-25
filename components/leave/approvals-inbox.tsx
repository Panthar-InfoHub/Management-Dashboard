"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, CalendarCheck, Check, Clock, Home, Plane, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RequestStatusBadge } from "@/components/leave/request-status-badge";
import { formatDay, formatRange, requestSummary } from "@/components/leave/format";
import { decideRequestAction, reviewAttendanceAction } from "@/lib/actions/request.actions";
import { ATTENDANCE_STATUS_LABELS, formatDuration, type AttendanceStatusValue } from "@/lib/attendance/rules";
import type { getInbox } from "@/lib/leave/queries";
import { cn } from "@/lib/utils";

type Inbox = NonNullable<Awaited<ReturnType<typeof getInbox>>>;
type PendingRequest = Inbox["requests"][number];
type Person = PendingRequest["employee"];

// ─── Building blocks ───

function PersonCell({ person }: { person: Person }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9">
        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">{person.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">{person.designation || "—"}</p>
      </div>
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">“{text}”</p>;
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Textarea aria-label="Note (optional)" placeholder="Note for them (optional)" rows={2} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

/** One section card: icon, title, count, one-line explanation, rows. */
function Section({ id, icon: Icon, title, hint, count, children }: { id: string; icon: typeof Plane; title: string; hint: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-xl border border-border/40">
      <header className="flex items-start gap-3 border-b border-border/40 bg-muted/20 px-5 py-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {title} <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] tabular-nums">{count}</Badge>
          </h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </header>
      <ul className="divide-y divide-border/40">{children}</ul>
    </section>
  );
}

/** Row layout shared by every section: person · details · actions. */
function Row({ person, children, actions }: { person: Person; children: ReactNode; actions: ReactNode }) {
  return (
    <li className="grid gap-4 px-5 py-4 lg:grid-cols-[220px_1fr_auto] lg:items-center">
      <PersonCell person={person} />
      <div className="min-w-0 space-y-1">{children}</div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
    </li>
  );
}

function DecisionButtons({ id, who, what }: { id: string; who: string; what: string }) {
  const [note, setNote] = useState("");
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
        onConfirm={async () => { await decideRequestAction(id, "APPROVE", note); return `${who}'s request approved`; }}
      >
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

/** "Recorded" vs "Asked for", side by side, for an attendance fix. */
function FixComparison({ r }: { r: PendingRequest }) {
  const rec = r.recorded;
  const recordedText = !rec || (!rec.checkIn && !rec.status)
    ? "Nothing recorded"
    : rec.checkIn
      ? `${rec.checkIn} → ${rec.checkOut ?? "no clock-out"}`
      : ATTENDANCE_STATUS_LABELS[rec.status as AttendanceStatusValue] ?? "—";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <div className="rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5">
        <p className="text-[11px] text-muted-foreground">Recorded</p>
        <p className="font-mono tabular-nums">
          {recordedText}
          {rec?.missedCheckout && <span className="ml-2 font-sans text-xs text-red-600 dark:text-red-400">missed checkout</span>}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="rounded-md border border-foreground/20 px-2.5 py-1.5">
        <p className="text-[11px] text-muted-foreground">Asked for</p>
        <p className="font-mono font-medium tabular-nums">
          {r.fixCheckIn} → {r.fixCheckOut}
          {r.fixMinutes != null && <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">{formatDuration(r.fixMinutes)}</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Inbox ───

export function ApprovalsInbox({ inbox }: { inbox: Inbox }) {
  const fixes = inbox.requests.filter((r) => r.kind === "ATTENDANCE_FIX");
  const leave = inbox.requests.filter((r) => r.kind === "LEAVE");
  const wfh = inbox.requests.filter((r) => r.kind === "WFH");
  const reviews = inbox.reviews;
  const total = inbox.requests.length + reviews.length;

  const summary = [
    { id: "fixes", label: "Attendance Fixes", count: fixes.length, icon: CalendarCheck },
    { id: "leave", label: "Leave", count: leave.length, icon: Plane },
    { id: "wfh", label: "Work From Home", count: wfh.length, icon: Home },
    { id: "half-days", label: "Half Days to Review", count: reviews.length, icon: Clock },
  ];

  return (
    <Tabs defaultValue="pending" className="space-y-6">
      <TabsList className="h-9">
        <TabsTrigger value="pending" className="text-xs">Waiting for You · {total}</TabsTrigger>
        <TabsTrigger value="decided" className="text-xs">Recently Decided</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-6">
        <nav aria-label="Sections" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border/40 px-4 py-3 transition-colors hover:bg-accent/40",
                s.count === 0 && "pointer-events-none opacity-50"
              )}
              aria-disabled={s.count === 0}
            >
              <s.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm">{s.label}</span>
              <span className="text-lg font-semibold tabular-nums">{s.count}</span>
            </a>
          ))}
        </nav>

        {total === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            Nothing waiting. New requests from your people will show here.
          </p>
        )}

        <Section id="fixes" icon={CalendarCheck} title="Attendance Fixes" count={fixes.length}
          hint="Someone forgot to clock out or clocked the wrong time. Approving writes the asked-for times to that day.">
          {fixes.map((r) => (
            <Row key={r.id} person={r.employee} actions={<DecisionButtons id={r.id} who={r.employee.name} what={`${formatDay(r.startDate)}: set to ${r.fixCheckIn} → ${r.fixCheckOut}.`} />}>
              <p className="text-sm font-medium">{formatDay(r.startDate)}</p>
              <FixComparison r={r} />
              <Reason text={r.reason} />
            </Row>
          ))}
        </Section>

        <Section id="leave" icon={Plane} title="Leave" count={leave.length}
          hint="Approving takes the days from their balance. Sundays and holidays aren't counted.">
          {leave.map((r) => (
            <Row key={r.id} person={r.employee} actions={<DecisionButtons id={r.id} who={r.employee.name} what={`${formatRange(r.startDate, r.endDate)} · ${requestSummary(r)}`} />}>
              <p className="text-sm font-medium">{formatRange(r.startDate, r.endDate)}</p>
              <p className="text-sm">
                {r.leaveType ?? "Leave"} · <span className="tabular-nums">{r.days} day{r.days === 1 ? "" : "s"}</span>
                {r.halfDay && <span className="text-muted-foreground"> · {r.halfDay === "FIRST_HALF" ? "first half" : "second half"}</span>}
              </p>
              <Reason text={r.reason} />
            </Row>
          ))}
        </Section>

        <Section id="wfh" icon={Home} title="Work From Home" count={wfh.length}
          hint="Approving makes those office days WFH for them, so clock-in won't need their location.">
          {wfh.map((r) => (
            <Row key={r.id} person={r.employee} actions={<DecisionButtons id={r.id} who={r.employee.name} what={`${formatRange(r.startDate, r.endDate)} · WFH`} />}>
              <p className="text-sm font-medium">{formatRange(r.startDate, r.endDate)}</p>
              <p className="text-sm tabular-nums">{r.days} office day{r.days === 1 ? "" : "s"}</p>
              <Reason text={r.reason} />
            </Row>
          ))}
        </Section>

        <Section id="half-days" icon={Clock} title="Half Days to Review" count={reviews.length}
          hint="Arrived after the late cut-off, or worked under the minimum hours. Keep it as a half day, or count it as a full day.">
          {reviews.map((a) => {
            const why = a.isLate ? `Arrived ${a.checkIn}, after the late cut-off` : `Worked ${a.workMinutes != null ? formatDuration(a.workMinutes) : "under the minimum hours"}`;
            return (
              <Row key={a.id} person={a.employee} actions={<ReviewButtons id={a.id} who={a.employee.name} late={a.isLate} what={`${formatDay(a.date)}: ${why.toLowerCase()}`} />}>
                <p className="text-sm font-medium">{formatDay(a.date)}</p>
                <p className="text-sm">{why}</p>
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  In {a.checkIn ?? "—"} · Out {a.checkOut ?? "—"}{a.workMinutes != null ? ` · ${formatDuration(a.workMinutes)}` : ""}
                </p>
              </Row>
            );
          })}
        </Section>
      </TabsContent>

      <TabsContent value="decided">
        {inbox.decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
            {inbox.decided.map((r) => (
              <li key={r.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[220px_1fr_auto] lg:items-center">
                <PersonCell person={r.employee} />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{formatRange(r.startDate, r.endDate)} <span className="font-normal text-muted-foreground">· {requestSummary(r)}</span></p>
                  <p className="text-xs text-muted-foreground">
                    By {r.decidedBy}{r.decidedAt ? ` on ${new Date(r.decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}{r.decisionNote ? ` · “${r.decisionNote}”` : ""}
                  </p>
                </div>
                <RequestStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
