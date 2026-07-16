"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";

export function SubmitUpdateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener("open-submit-update", handleOpen);
    return () => document.removeEventListener("open-submit-update", handleOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Submit Daily Update
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">What did you accomplish today?</label>
            <Textarea placeholder="List your completed tasks, PRs, or meetings..." className="min-h-[60px] text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-destructive">Any blockers? (Optional)</label>
            <Textarea placeholder="What's slowing you down?" className="min-h-[40px] text-sm resize-none border-destructive/20 focus-visible:ring-destructive/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">What's the plan for tomorrow?</label>
            <Textarea placeholder="What are your priorities for the next working day?" className="min-h-[60px] text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setOpen(false)} size="sm" className="gap-2"><Send className="h-3.5 w-3.5" /> Submit Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
