"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DONE_NOTE_MIN } from "@/lib/tasks/keys";

/** Asks what was done before a task moves to Done. */
export function DoneNoteDialog({
  open,
  taskTitle,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  taskTitle?: string;
  pending?: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const ok = note.trim().length >= DONE_NOTE_MIN;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !pending) { setNote(""); onCancel(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Done</DialogTitle>
          <DialogDescription>{taskTitle ? `“${taskTitle}”: ` : ""}what was done? This stays on the task.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (ok) { onConfirm(note.trim()); setNote(""); } }}
        >
          <Textarea
            autoFocus
            aria-label="What was done"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Built the export, tested with November data, deployed to staging."
            className="min-h-28"
            disabled={pending}
          />
          <p className="text-[11px] text-muted-foreground">{ok ? "Looks good." : `At least ${DONE_NOTE_MIN} characters.`}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setNote(""); onCancel(); }} disabled={pending}>Keep Open</Button>
            <Button type="submit" disabled={!ok || pending}>{pending ? "Saving…" : "Mark as Done"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
