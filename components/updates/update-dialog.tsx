"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateForm } from "@/components/updates/update-form";
import { getMyUpdateFormAction } from "@/lib/actions/daily-update.actions";
import type { UpdateFormData } from "@/lib/updates/queries";

/**
 * Offered after clocking out: add (or edit) today's update. Optional; Skip closes it.
 * `dateKey` is the day just worked.
 */
export function UpdateDialog({ open, onOpenChange, dateKey }: { open: boolean; onOpenChange: (open: boolean) => void; dateKey: string }) {
  const [data, setData] = useState<UpdateFormData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    getMyUpdateFormAction(dateKey)
      .then((d) => { if (live) { setData(d); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; setData(null); };
  }, [open, dateKey]);

  const hasUpdate = !!data?.update;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{hasUpdate ? "Edit Today's Update" : "Add Today's Update"}</DialogTitle>
          <DialogDescription>
            {hasUpdate ? "You've already added an update for today. Change it if you need to." : "Optional. Note what you worked on today; you can also add or edit it later from Daily Updates."}
          </DialogDescription>
        </DialogHeader>
        {failed ? (
          <p className="text-sm text-muted-foreground">Couldn&rsquo;t load your update. You can add it later from Daily Updates.</p>
        ) : data ? (
          <UpdateForm initial={data} onDone={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} cancelLabel="Skip" />
        ) : (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
