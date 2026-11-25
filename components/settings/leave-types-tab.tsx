"use client";

import { useState, useTransition } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createLeaveTypeAction, updateLeaveTypeAction } from "@/lib/actions/attendance-settings.actions";
import { errorMessage } from "@/lib/utils";

type LeaveTypeRow = { id: string; name: string; yearlyDays: number | null; carryOverMax: number; isPaid: boolean; isActive: boolean };
type Draft = { name: string; yearlyDays: string; carryOverMax: string; isPaid: boolean; isActive: boolean };

const toDraft = (t: LeaveTypeRow | null): Draft =>
  t
    ? { name: t.name, yearlyDays: t.yearlyDays === null ? "" : String(t.yearlyDays), carryOverMax: String(t.carryOverMax), isPaid: t.isPaid, isActive: t.isActive }
    : { name: "", yearlyDays: "12", carryOverMax: "0", isPaid: true, isActive: true };

const fromDraft = (d: Draft) => ({
  name: d.name,
  yearlyDays: d.yearlyDays.trim() === "" ? null : Number(d.yearlyDays),
  carryOverMax: Number(d.carryOverMax || 0),
  isPaid: d.isPaid,
  isActive: d.isActive,
});

function Row({ type, onSaved }: { type: LeaveTypeRow | null; onSaved?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(toDraft(type));
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(type));

  const save = () => {
    startTransition(async () => {
      try {
        if (type) await updateLeaveTypeAction(type.id, fromDraft(draft));
        else await createLeaveTypeAction(fromDraft(draft));
        toast.success(type ? `${draft.name} saved` : `${draft.name} added`);
        onSaved?.();
      } catch (err) {
        toast.error(errorMessage(err, "Leave type not saved. Try again."));
      }
    });
  };

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-3"><Input aria-label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={isPending} placeholder="e.g. Casual Leave" /></td>
      <td className="py-2 pr-3"><Input aria-label="Days per year" inputMode="decimal" className="w-24 tabular-nums" value={draft.yearlyDays} onChange={(e) => setDraft({ ...draft, yearlyDays: e.target.value })} placeholder="No limit" disabled={isPending} /></td>
      <td className="py-2 pr-3"><Input aria-label="Carry over" inputMode="decimal" className="w-24 tabular-nums" value={draft.carryOverMax} onChange={(e) => setDraft({ ...draft, carryOverMax: e.target.value })} disabled={isPending} /></td>
      <td className="py-2 pr-3"><Switch aria-label="Paid" checked={draft.isPaid} onCheckedChange={(v) => setDraft({ ...draft, isPaid: v })} disabled={isPending} /></td>
      <td className="py-2 pr-3"><Switch aria-label="Active" checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} disabled={isPending} /></td>
      <td className="py-2 text-right">
        <Button size="sm" variant={type ? "outline" : "default"} onClick={save} disabled={isPending || !dirty || !draft.name.trim()}>
          {isPending ? "Saving…" : type ? "Save" : "Add Leave Type"}
        </Button>
      </td>
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
            Same for everyone. Leave the days empty for no limit. Unused days up to the carry-over limit move to the next year (January–December).
            Types already used can be turned off, not deleted. Changing the days or carry-over updates everyone&apos;s balance.
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

      <div className="overflow-x-auto rounded-lg border border-border/40 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Days / Year</th>
              <th className="py-2 pr-3 font-medium">Carry Over</th>
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
