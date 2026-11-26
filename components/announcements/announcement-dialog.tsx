"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TeamPicker } from "@/components/teams/team-picker";
import { createAnnouncementAction, updateAnnouncementAction } from "@/lib/actions/announcement.actions";
import type { AnnouncementView } from "@/lib/queries/announcement.queries";
import { errorMessage } from "@/lib/utils";

/** Post a new announcement, or edit one (pass `existing`). */
export function AnnouncementDialog({ teams, existing, trigger }: { teams: { id: string; name: string }[]; existing?: AnnouncementView; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const blank = { title: "", body: "", teamIds: [] as string[], pinned: false, expiresOn: "" };
  const [form, setForm] = useState(existing ? { title: existing.title, body: existing.body, teamIds: existing.teamIds, pinned: existing.pinned, expiresOn: existing.expiresAt ?? "" } : blank);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    startTransition(async () => {
      try {
        const input = { ...form, expiresOn: form.expiresOn || null };
        if (existing) {
          await updateAnnouncementAction(existing.id, input);
          toast.success("Announcement updated");
        } else {
          const res = await createAnnouncementAction(input);
          toast.success(`Announcement posted · ${res.notified} ${res.notified === 1 ? "person" : "people"} notified`);
          setForm(blank);
        }
        setOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "Announcement not saved. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          <DialogDescription>{existing ? "Changes show right away. People aren't notified again." : "Everyone in the audience gets a notification."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="an-title" className="text-xs font-semibold text-muted-foreground">Title</label>
            <Input id="an-title" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Office closed on Friday" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="an-body" className="text-xs font-semibold text-muted-foreground">Message</label>
            <Textarea id="an-body" rows={6} maxLength={4000} value={form.body} onChange={(e) => set({ body: e.target.value })} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Audience</span>
            <TeamPicker teams={teams} value={form.teamIds} onChange={(ids) => set({ teamIds: ids })} disabled={isPending} />
            <p className="text-[11px] text-muted-foreground">{form.teamIds.length ? "Only people in the ticked teams see it." : "No team ticked: everyone sees it."}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="an-until" className="text-xs font-semibold text-muted-foreground">Show Until (optional)</label>
              <DatePicker id="an-until" value={form.expiresOn} onChange={(v) => set({ expiresOn: v })} disabled={isPending} placeholder="Always" clearable />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <Checkbox checked={form.pinned} onCheckedChange={(v) => set({ pinned: v === true })} disabled={isPending} />
              Pin to the top
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !form.title.trim() || !form.body.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {isPending ? (existing ? "Saving…" : "Posting…") : existing ? "Save Announcement" : "Post Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
