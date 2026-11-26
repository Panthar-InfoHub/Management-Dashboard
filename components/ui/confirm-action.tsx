"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";

/**
 * A button that asks before it acts. While the action runs the confirm button
 * shows a spinner and `pendingLabel`; the dialog closes only on success, and an
 * error keeps it open with a toast so the person can retry or cancel.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive = false,
  disabled = false,
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  /** Keep the confirm button off, e.g. while the fields are invalid. */
  disabled?: boolean;
  /** Return a success message to toast, or nothing. Throw to show an error. */
  onConfirm: () => Promise<string | void>;
  /** Extra fields shown in the dialog (e.g. a note). */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const message = await onConfirm();
        if (message) toast.success(message);
        setOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "That didn't work. Try again."));
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} onClick={run} disabled={isPending || disabled} aria-busy={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
