"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { offboardEmployeeAction } from "@/lib/actions/employee.actions";
import type { OffboardingChecklist } from "@/lib/employees/offboarding";
import { errorMessage } from "@/lib/utils";

function Item({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />}
      <div className="min-w-0 space-y-1">{children}</div>
    </li>
  );
}

/** Offboarding with a checklist: leads block it; tasks, requests and leave are shown and handled. */
export function OffboardDialog({ employeeId, name, checklist }: { employeeId: string; name: string; checklist: OffboardingChecklist }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [unassignTasks, setUnassignTasks] = useState(true);
  const blocked = checklist.ledProjects.length > 0 || checklist.ledTeams.length > 0;

  const submit = () => {
    startTransition(async () => {
      try {
        const res = await offboardEmployeeAction(employeeId, { endDate, reason, unassignTasks });
        const extra = [res.unassigned && `${res.unassigned} task${res.unassigned === 1 ? "" : "s"} unassigned`, res.cancelled && `${res.cancelled} request${res.cancelled === 1 ? "" : "s"} cancelled`].filter(Boolean).join(", ");
        toast.success(`${name} offboarded${extra ? ` · ${extra}` : ""}`);
        setOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "Offboarding didn't finish. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-500/30 bg-background text-amber-600 hover:bg-amber-500/5">
          <UserMinus className="h-4 w-4" /> Offboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offboard {name}</DialogTitle>
          <DialogDescription>Their sign-in is removed and they leave their team and projects. Their history (tasks, attendance, leave, ledger) is kept.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 rounded-lg border border-border/40 p-4">
          <Item ok={!blocked}>
            {blocked ? (
              <>
                <p className="font-medium">Hand over what they lead first</p>
                {[...checklist.ledTeams.map((t) => ({ ...t, href: `/teams/${t.id}`, kind: "Team" })), ...checklist.ledProjects.map((p) => ({ ...p, href: `/projects/${p.id}`, kind: "Project" }))].map((x) => (
                  <Link key={x.id} href={x.href} className="block text-xs underline underline-offset-2">{x.kind}: {x.name}</Link>
                ))}
              </>
            ) : (
              <p>Doesn&apos;t lead any team or active project</p>
            )}
          </Item>
          <Item ok={checklist.openTaskCount === 0 || unassignTasks}>
            {checklist.openTaskCount === 0 ? (
              <p>No open tasks</p>
            ) : (
              <>
                <p>{checklist.openTaskCount} open task{checklist.openTaskCount === 1 ? "" : "s"}</p>
                <ul className="text-xs text-muted-foreground">
                  {checklist.openTasks.map((t) => <li key={t.id} className="truncate">{t.title} · {t.project}</li>)}
                  {checklist.openTaskCount > checklist.openTasks.length && <li>…and {checklist.openTaskCount - checklist.openTasks.length} more</li>}
                </ul>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-foreground" checked={unassignTasks} onChange={(e) => setUnassignTasks(e.target.checked)} disabled={isPending} />
                  Unassign them, so they show as needing an owner
                </label>
              </>
            )}
          </Item>
          <Item ok>
            <p>{checklist.openRequests ? `${checklist.openRequests} pending or upcoming request${checklist.openRequests === 1 ? "" : "s"} will be cancelled` : "No pending requests"}</p>
          </Item>
          <Item ok>
            {checklist.balances.length ? (
              <p>Leave left for final settlement: {checklist.balances.map((b) => `${b.name} ${b.available}`).join(" · ")}</p>
            ) : (
              <p>No paid leave left to settle</p>
            )}
          </Item>
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ob-date" className="text-xs font-semibold text-muted-foreground">Last Working Day</label>
            <Input id="ob-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ob-reason" className="text-xs font-semibold text-muted-foreground">Reason</label>
            <Input id="ob-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Resigned, End of internship" disabled={isPending} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={isPending || blocked || !reason.trim() || !endDate}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {isPending ? "Offboarding…" : `Offboard ${name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
