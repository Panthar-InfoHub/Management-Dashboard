"use client";

import { useState, useTransition } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createLeaveTypeAction, previewLeaveLimitAction, updateLeaveTypeAction } from "@/lib/actions/attendance-settings.actions";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { errorMessage } from "@/lib/utils";

type LeaveTypeRow = { id: string; name: string; yearlyDays: number | null; isPaid: boolean; isActive: boolean };
type Draft = { name: string; yearlyDays: string; isPaid: boolean; isActive: boolean };

const toDraft = (t: LeaveTypeRow | null): Draft =>
  t
    ? { name: t.name, yearlyDays: t.yearlyDays === null ? "" : String(t.yearlyDays), isPaid: t.isPaid, isActive: t.isActive }
    : { name: "", yearlyDays: "12", isPaid: true, isActive: true };

const fromDraft = (d: Draft) => ({
  name: d.name,
  yearlyDays: d.yearlyDays.trim() === "" ? null : Number(d.yearlyDays),
  isPaid: d.isPaid,
  isActive: d.isActive,
});

function Row({ type, onSaved }: { type: LeaveTypeRow | null; onSaved?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(toDraft(type));
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(type));
  const [impact, setImpact] = useState<{ year: number; over: { name: string; overBy: number }[] } | null>(null);

  const commit = () => {
    startTransition(async () => {
      try {
        if (type) await updateLeaveTypeAction(type.id, fromDraft(draft));
        else await createLeaveTypeAction(fromDraft(draft));
        toast.success(type ? `${draft.name} saved` : `${draft.name} added`);
        setImpact(null);
        onSaved?.();
      } catch (err) {
        toast.error(errorMessage(err, "Leave type not saved. Try again."));
      }
    });
  };

  // Lowering a limit (or limiting a no-limit type) can put people over it: show who first.
  const save = () => {
    const next = fromDraft(draft).yearlyDays;
    const tighter = type && next !== null && (type.yearlyDays === null || next < type.yearlyDays);
    if (!tighter) return commit();
    startTransition(async () => {
      try {
        const res = await previewLeaveLimitAction(type.id, next);
        if (res.over.length === 0) return commit();
        setImpact(res);
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't check balances. Try again."));
      }
    });
  };

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-3"><Input aria-label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={isPending} placeholder="e.g. Casual Leave" /></td>
      <td className="py-2 pr-3"><Input aria-label="Days per year" inputMode="decimal" className="w-24 tabular-nums" value={draft.yearlyDays} onChange={(e) => setDraft({ ...draft, yearlyDays: e.target.value })} placeholder="No limit" disabled={isPending} /></td>
      <td className="py-2 pr-3"><Switch aria-label="Paid" checked={draft.isPaid} onCheckedChange={(v) => setDraft({ ...draft, isPaid: v })} disabled={isPending} /></td>
      <td className="py-2 pr-3"><Switch aria-label="Active" checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} disabled={isPending} /></td>
      <td className="py-2 text-right">
        <Button size="sm" variant={type ? "outline" : "default"} onClick={save} disabled={isPending || !dirty || !draft.name.trim()}>
          {isPending ? "Saving…" : type ? "Save" : "Add Leave Type"}
        </Button>
      </td>
      {impact && (
        <td className="hidden">
          <AlertDialog open onOpenChange={(v) => !v && !isPending && setImpact(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Lower {draft.name} to {draft.yearlyDays} days?</AlertDialogTitle>
                <AlertDialogDescription>
                  {impact.over.length} {impact.over.length === 1 ? "person has" : "people have"} already taken or requested more than that in {impact.year}.
                  Their leave stays approved, but their balance goes below zero and they can&apos;t take more {draft.name} this year.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/70 text-sm">
                {impact.over.map((p) => (
                  <li key={p.name} className="flex items-center justify-between px-3 py-2">
                    <span>{p.name}</span>
                    <span className="tabular-nums text-destructive">{p.overBy} day{p.overBy === 1 ? "" : "s"} over</span>
                  </li>
                ))}
              </ul>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Keep {type?.yearlyDays ?? "No Limit"}</AlertDialogCancel>
                <Button onClick={commit} disabled={isPending}>{isPending ? "Saving…" : `Lower to ${draft.yearlyDays} Days`}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </td>
      )}
    </tr>
  );
}

export function LeaveTypesTab({ types }: { types: LeaveTypeRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Leave Types</h3>
          <p className="text-xs text-muted-foreground">
            Same for everyone. Leave the days empty for no limit. Balances reset every January; unused days don&apos;t carry over.
            Types already used can be turned off, not deleted. Changing the days updates everyone&apos;s balance.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
            <Button key={y} asChild variant="outline" size="sm" className="gap-1">
              <a href={`/api/leave/export?year=${y}`} download><Download className="h-3.5 w-3.5" /> Leave Report {y}</a>
            </Button>
          ))}
          {!adding && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> New Leave Type
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 px-4 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Days / Year</th>
              <th className="py-2 pr-3 font-medium">Paid</th>
              <th className="py-2 pr-3 font-medium">Active</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => <Row key={t.id} type={t} />)}
            {adding && <Row type={null} onSaved={() => setAdding(false)} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
