"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PeoplePicker, type Person } from "@/components/teams/team-dialogs";
import { createSubtaskAction } from "@/lib/actions/task.actions";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const PRIORITIES = [
  { id: "LOW", label: "Low", dot: "bg-neutral-400" },
  { id: "MEDIUM", label: "Medium", dot: "bg-neutral-500" },
  { id: "HIGH", label: "High", dot: "bg-orange-500" },
  { id: "CRITICAL", label: "Critical", dot: "bg-red-500" },
] as const;
type Priority = (typeof PRIORITIES)[number]["id"];

const fmt = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Full "New Subtask" dialog: title, notes, priority, due date and people. */
export function NewSubtaskDialog({
  parent,
  people,
  canAssignOthers,
  currentEmployeeId,
}: {
  parent: { id: string; title: string; key: string | null; priority: string; dueDate?: string };
  /** Who can be assigned (project members); narrowed to yourself without assign rights. */
  people: Person[];
  canAssignOthers: boolean;
  currentEmployeeId?: string;
}) {
  const assignable = canAssignOthers ? people : people.filter((p) => p.id === currentEmployeeId);
  const meFirst = currentEmployeeId && assignable.some((p) => p.id === currentEmployeeId) ? [currentEmployeeId] : [];
  const blank = () => ({ title: "", description: "", priority: (parent.priority as Priority) ?? "MEDIUM", dueDate: "", assigneeIds: meFirst });

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(blank);
  const [another, setAnother] = useState(false);
  const set = (patch: Partial<ReturnType<typeof blank>>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.title.trim() || isPending) return;
    startTransition(async () => {
      try {
        await createSubtaskAction(parent.id, {
          title: form.title,
          description: form.description,
          priority: form.priority,
          assigneeIds: form.assigneeIds,
          dueDate: form.dueDate || null,
        });
        toast.success(`Subtask added: ${form.title.trim()}`);
        if (another) setForm((f) => ({ ...blank(), priority: f.priority, dueDate: f.dueDate, assigneeIds: f.assigneeIds }));
        else { setForm(blank()); setOpen(false); }
      } catch (err) {
        toast.error(errorMessage(err, "Subtask not created. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-4 w-full justify-start border-dashed text-muted-foreground">
          <Plus className="mr-2 h-3.5 w-3.5" /> Add Subtask
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>New Subtask</DialogTitle>
          <DialogDescription className="truncate">
            Part of {parent.key && <span className="font-mono text-foreground">{parent.key}</span>} {parent.title}
          </DialogDescription>
        </DialogHeader>

        <form
          id="new-subtask"
          className="flex-1 space-y-6 overflow-y-auto px-6 py-5"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subtask-title">Title</Label>
              <Input id="subtask-title" autoFocus className="h-10 text-base" placeholder="What needs to be done?" value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subtask-desc">Details <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="subtask-desc" rows={3} placeholder="Steps, links or acceptance notes" value={form.description} onChange={(e) => set({ description: e.target.value })} disabled={isPending} />
            </div>
          </div>

          <div className="grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div role="radiogroup" aria-label="Priority" className="flex w-full rounded-lg border border-border p-0.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={form.priority === p.id}
                    onClick={() => set({ priority: p.id })}
                    disabled={isPending}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                      form.priority === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />{p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subtask-due">Due Date</Label>
              <DatePicker id="subtask-due" value={form.dueDate} max={parent.dueDate} onChange={(v) => set({ dueDate: v })} placeholder="No due date" clearable disabled={isPending} />
              {parent.dueDate && <p className="text-xs text-muted-foreground">By {fmt(parent.dueDate)}, when the main task is due.</p>}
            </div>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-5">
            <Label>People</Label>
            {assignable.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one is on this project yet. Add members to the project first.</p>
            ) : (
              <PeoplePicker people={assignable} value={form.assigneeIds} onChange={(ids) => set({ assigneeIds: ids })} disabled={isPending} addLabel="Add Assignee" />
            )}
            <p className="text-xs text-muted-foreground">
              {form.assigneeIds.length > 0
                ? "The first person is the Owner, responsible for getting it done."
                : canAssignOthers ? "Only project members can be assigned. Leave empty to assign later." : "You can assign this subtask to yourself."}
            </p>
          </div>
        </form>

        <DialogFooter className="m-0 rounded-b-xl items-center border-t border-border/60 px-6 py-3 sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={another} onCheckedChange={setAnother} disabled={isPending} /> Create another
          </label>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">⌘/Ctrl + Enter</span>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" form="new-subtask" disabled={!form.title.trim() || isPending}>{isPending ? "Creating…" : "Create Subtask"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
