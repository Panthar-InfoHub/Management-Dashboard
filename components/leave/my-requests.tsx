"use client";

import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RequestStatusBadge } from "@/components/leave/request-status-badge";
import { formatRange, requestSummary } from "@/components/leave/format";
import { cancelRequestAction } from "@/lib/actions/request.actions";
import type { RequestView } from "@/lib/leave/queries";

export function MyRequests({ requests, emptyText }: { requests: RequestView[]; emptyText: string }) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border/40 rounded-lg border border-border/40">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{formatRange(r.startDate, r.endDate)}</span>
              <RequestStatusBadge status={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">{requestSummary(r)} · {r.reason}</p>
            {r.decidedBy && (
              <p className="text-xs text-muted-foreground">
                {r.status === "APPROVED" ? "Approved" : "Rejected"} by {r.decidedBy}{r.decisionNote ? `: “${r.decisionNote}”` : ""}
              </p>
            )}
          </div>
          {r.canCancel && (
            <ConfirmAction
              trigger={<Button variant="ghost" size="sm" className="self-start text-xs sm:self-auto">Cancel Request</Button>}
              title="Cancel this request?"
              description={`${formatRange(r.startDate, r.endDate)} · ${requestSummary(r)}${r.status === "APPROVED" && r.kind === "LEAVE" ? ". The days go back to your balance." : "."}`}
              confirmLabel="Cancel Request"
              pendingLabel="Cancelling…"
              destructive
              onConfirm={async () => { await cancelRequestAction(r.id); return "Request cancelled"; }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
