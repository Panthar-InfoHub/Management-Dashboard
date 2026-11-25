"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { deleteAnnouncementAction } from "@/lib/actions/announcement.actions";
import type { AnnouncementView } from "@/lib/queries/announcement.queries";

export function AnnouncementActions({ a, teams }: { a: AnnouncementView; teams: { id: string; name: string }[] }) {
  return (
    <div className="flex shrink-0 gap-1">
      <AnnouncementDialog teams={teams} existing={a} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit announcement"><Pencil className="h-3.5 w-3.5" /></Button>} />
      <ConfirmAction
        trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label="Delete announcement"><Trash2 className="h-3.5 w-3.5" /></Button>}
        title={`Delete “${a.title}”?`}
        description="It disappears for everyone. This can't be undone."
        confirmLabel="Delete Announcement"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => { await deleteAnnouncementAction(a.id); return "Announcement deleted"; }}
      />
    </div>
  );
}
