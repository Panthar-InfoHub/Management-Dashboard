"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { transitionRoleAction } from "@/lib/actions/employee.actions";
import { ACCESS_ROLES, ROLE_LABELS, type AccessRole } from "@/lib/access";
import { errorMessage } from "@/lib/utils";
import { TeamPicker } from "@/components/teams/team-picker";

type EventType = "PROMOTION" | "TRANSFER" | "TITLE_CHANGE";
const EVENT_HELP: Record<EventType, string> = {
  PROMOTION: "A step up: usually a new title, sometimes a new team.",
  TRANSFER: "Joining and/or leaving teams, with the same or a new title.",
  TITLE_CHANGE: "A new title without a promotion, e.g. a correction or a role rename.",
};

/** Promotion / transfer / title change, written to the employment ledger. */
export function PromoteDialog({
  employee,
  teams,
  canAssignRoles,
}: {
  employee: { id: string; firstName: string; role: string; designation: string | null; teamIds: string[]; ledTeamIds: string[] };
  teams: { id: string; name: string }[];
  canAssignRoles: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<EventType>("PROMOTION");
  const [form, setForm] = useState({
    designation: "",
    teamIds: employee.teamIds,
    role: employee.role as AccessRole,
    startDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const teamChanged = form.teamIds.length !== employee.teamIds.length || form.teamIds.some((id) => !employee.teamIds.includes(id));
  const valid =
    form.reason.trim() &&
    form.startDate &&
    (type !== "TITLE_CHANGE" || form.designation.trim()) &&
    (type !== "TRANSFER" || teamChanged) &&
    (type !== "PROMOTION" || form.designation.trim() || teamChanged || form.role !== employee.role);

  const submit = () => {
    startTransition(async () => {
      try {
        await transitionRoleAction(employee.id, {
          type,
          newDesignation: form.designation.trim() || undefined,
          teamIds: teamChanged ? form.teamIds : undefined,
          ...(canAssignRoles && form.role !== employee.role && { newRole: form.role }),
          startDate: form.startDate,
          reason: form.reason,
        });
        toast.success(`${type === "TRANSFER" ? "Transfer" : type === "PROMOTION" ? "Promotion" : "Title change"} recorded for ${employee.firstName}`);
        setOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "Not saved. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 bg-background text-primary hover:bg-primary/5">
          <ArrowUpRight className="h-4 w-4" /> Promote / Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change {employee.firstName}&apos;s Role</DialogTitle>
          <DialogDescription>Recorded in the employment ledger. {employee.firstName} is notified.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">What Changed</label>
            <Select value={type} onValueChange={(v) => setType(v as EventType)} disabled={isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROMOTION">Promotion</SelectItem>
                <SelectItem value="TRANSFER">Transfer to another team</SelectItem>
                <SelectItem value="TITLE_CHANGE">Title change</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{EVENT_HELP[type]}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pr-title" className="text-xs font-semibold text-muted-foreground">New Title {type === "TRANSFER" && "(optional)"}</label>
            <Input id="pr-title" value={form.designation} onChange={(e) => set({ designation: e.target.value })} placeholder={employee.designation ?? "e.g. Senior Developer"} disabled={isPending} />
          </div>
          {type !== "TITLE_CHANGE" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Teams</label>
              <TeamPicker teams={teams} value={form.teamIds} onChange={(ids) => set({ teamIds: ids })} disabled={isPending} lockedIds={employee.ledTeamIds} />
              <p className="text-[11px] text-muted-foreground">Tick to join a team, untick to leave it. Their other teams stay as they are.</p>
            </div>
          )}
          {canAssignRoles && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Access Role</label>
              <Select value={form.role} onValueChange={(v) => set({ role: v as AccessRole })} disabled={isPending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCESS_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pr-date" className="text-xs font-semibold text-muted-foreground">Takes Effect</label>
              <Input id="pr-date" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pr-reason" className="text-xs font-semibold text-muted-foreground">Reason</label>
              <Input id="pr-reason" value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="e.g. Annual review" disabled={isPending} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !valid}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {isPending ? "Saving…" : "Save Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
