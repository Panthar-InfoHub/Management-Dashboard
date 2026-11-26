"use client";

import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { pruneAuditLogAction } from "@/lib/actions/audit.actions";

export function PruneAuditButton() {
  return (
    <ConfirmAction
      trigger={<Button variant="outline" size="sm" className="h-8 text-xs">Delete Entries Older Than 12 Months</Button>}
      title="Delete audit history older than 12 months?"
      description="Older entries are removed for good. Recent history is kept. This deletion is itself recorded."
      confirmLabel="Delete Old Entries"
      pendingLabel="Deleting…"
      destructive
      onConfirm={async () => {
        const { deleted } = await pruneAuditLogAction(12);
        return deleted ? `${deleted} old entr${deleted === 1 ? "y" : "ies"} deleted` : "Nothing older than 12 months";
      }}
    />
  );
}
