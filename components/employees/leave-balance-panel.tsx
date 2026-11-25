"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { adjustBalanceAction } from "@/lib/actions/request.actions";

type Balance = { leaveTypeId: string; name: string; unlimited: boolean; allowed: number; carriedOver: number; adjusted: number; used: number; pending: number; available: number | null };

function AdjustButton({ employeeId, employeeName, year, balance }: { employeeId: string; employeeName: string; year: number; balance: Balance }) {
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const n = Number(delta);
  return (
    <ConfirmAction
      trigger={<Button variant="ghost" size="sm" className="h-7 text-xs">Adjust</Button>}
      title={`Adjust ${employeeName}'s ${balance.name}`}
      description={`Now ${balance.available} available in ${year}. Use a negative number to remove days.`}
      confirmLabel="Save Adjustment"
      pendingLabel="Saving…"
      onConfirm={async () => {
        await adjustBalanceAction({ employeeId, leaveTypeId: balance.leaveTypeId, year, delta: n, note });
        setDelta(""); setNote("");
        return `${balance.name} ${n > 0 ? "+" : "−"}${Math.abs(n)} for ${employeeName}`;
      }}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={`adj-${balance.leaveTypeId}`} className="text-xs font-semibold text-muted-foreground">Days (e.g. 2 or -1.5)</label>
          <Input id={`adj-${balance.leaveTypeId}`} inputMode="decimal" value={delta} onChange={(e) => setDelta(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`adj-note-${balance.leaveTypeId}`} className="text-xs font-semibold text-muted-foreground">Reason</label>
          <Textarea id={`adj-note-${balance.leaveTypeId}`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Comp-off for weekend release" />
        </div>
      </div>
    </ConfirmAction>
  );
}

/** HR view of one person's leave balance, with adjustments (leave:manage). */
export function LeaveBalancePanel({ employeeId, employeeName, year, balances }: { employeeId: string; employeeName: string; year: number; balances: Balance[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <Plane className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold tracking-tight">Leave Balance {year}</h3>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Allowed</th>
              <th className="px-3 py-2 text-right font-medium">Carried</th>
              <th className="px-3 py-2 text-right font-medium">Adjusted</th>
              <th className="px-3 py-2 text-right font-medium">Used</th>
              <th className="px-3 py-2 text-right font-medium">Pending</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {balances.map((b) => (
              <tr key={b.leaveTypeId} className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">{b.name}</td>
                {b.unlimited ? (
                  <td colSpan={6} className="px-3 py-2 text-right text-xs text-muted-foreground">No limit</td>
                ) : (
                  <>
                    <td className="px-3 py-2 text-right">{b.allowed}</td>
                    <td className="px-3 py-2 text-right">{b.carriedOver}</td>
                    <td className="px-3 py-2 text-right">{b.adjusted > 0 ? `+${b.adjusted}` : b.adjusted}</td>
                    <td className="px-3 py-2 text-right">{b.used}</td>
                    <td className="px-3 py-2 text-right">{b.pending}</td>
                    <td className="px-3 py-2 text-right font-semibold">{b.available}</td>
                  </>
                )}
                <td className="px-3 py-2 text-right">
                  {!b.unlimited && <AdjustButton employeeId={employeeId} employeeName={employeeName} year={year} balance={b} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
