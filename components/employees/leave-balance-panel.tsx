"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { adjustBalanceAction } from "@/lib/actions/request.actions";

type Balance = { leaveTypeId: string; name: string; unlimited: boolean; allowed: number; adjusted: number; used: number; pending: number; available: number | null };

/** "4", or "2 over" when someone has taken more than the limit. */
export function daysLabel(n: number) {
  return n < 0 ? `${Math.abs(n)} over` : String(n);
}

function AdjustButton({ employeeId, employeeName, year, balance }: { employeeId: string; employeeName: string; year: number; balance: Balance }) {
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const n = Number(delta);
  const valid = delta.trim() !== "" && Number.isFinite(n) && n !== 0 && Number.isInteger(n * 2);
  const current = balance.available ?? 0;
  const after = current + (valid ? n : 0);
  const belowZero = valid && after < 0;
  return (
    <ConfirmAction
      trigger={<Button variant="ghost" size="sm" className="h-7 text-xs">Adjust</Button>}
      title={`Adjust ${employeeName}'s ${balance.name}`}
      description={`Now ${balance.available} available in ${year}. Use a negative number to remove days.`}
      confirmLabel="Save Adjustment"
      disabled={!valid || belowZero || note.trim().length < 3}
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
          <Input id={`adj-${balance.leaveTypeId}`} inputMode="decimal" value={delta} onChange={(e) => setDelta(e.target.value)} aria-invalid={belowZero} />
          {valid && (
            <p className={`text-xs ${belowZero ? "text-destructive" : "text-muted-foreground"}`}>
              {belowZero
                ? current <= 0
                  ? `Nothing left to remove. ${employeeName} has ${daysLabel(current)}.`
                  : `Only ${current} left. Remove ${current} or fewer.`
                : `${current} → ${after} available`}
            </p>
          )}
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
    <Panel title={`Leave Balance ${year}`} description="Days per leave type; adjust to correct or add comp-offs" bodyClassName="px-0 pb-1">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Allowed</th>
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
                <td className="px-5 py-2 font-medium">{b.name}</td>
                {b.unlimited ? (
                  <td colSpan={5} className="px-3 py-2 text-right text-xs text-muted-foreground">No limit</td>
                ) : (
                  <>
                    <td className="px-3 py-2 text-right">{b.allowed}</td>
                    <td className="px-3 py-2 text-right">{b.adjusted > 0 ? `+${b.adjusted}` : b.adjusted}</td>
                    <td className="px-3 py-2 text-right">{b.used}</td>
                    <td className="px-3 py-2 text-right">{b.pending}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${(b.available ?? 0) < 0 ? "text-destructive" : ""}`}>{daysLabel(b.available ?? 0)}</td>
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
    </Panel>
  );
}
