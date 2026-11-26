"use client";
import { Checkbox } from "@/components/ui/checkbox";

import { useState, useTransition } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PERMISSION_GROUPS } from "@/lib/permission-list";
import { createAccessPresetAction, deleteAccessPresetAction, updateAccessPresetAction } from "@/lib/actions/access.actions";
import { cn, errorMessage } from "@/lib/utils";

export type PresetRow = { id: string; name: string; description: string | null; permissions: string[]; _count: { members: number } };

type Draft = { id: string | null; name: string; description: string; permissions: string[] };

const ROLE_SUMMARY = [
  { name: "Super Admin", text: "Everything, including managing Admins. Not tracked in attendance." },
  { name: "Admin", text: "Everything except managing Admins and Super Admins." },
  { name: "Member", text: "Their own work, plus their presets, extra permissions, and what they lead." },
];

function toDraft(p: PresetRow | null): Draft {
  return p ? { id: p.id, name: p.name, description: p.description ?? "", permissions: p.permissions } : { id: null, name: "", description: "", permissions: [] };
}

export function AccessPresetsTab({ presets }: { presets: PresetRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(presets[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(toDraft(presets[0] ?? null));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = presets.find((p) => p.id === selectedId) ?? null;

  const select = (p: PresetRow | null) => {
    setSelectedId(p?.id ?? null);
    setDraft(toDraft(p));
  };

  const togglePermission = (id: string) =>
    setDraft((d) => ({ ...d, permissions: d.permissions.includes(id) ? d.permissions.filter((p) => p !== id) : [...d.permissions, id] }));

  const save = () => {
    startTransition(async () => {
      try {
        if (draft.id) {
          await updateAccessPresetAction(draft.id, { name: draft.name, description: draft.description, permissions: draft.permissions });
          toast.success(`Preset “${draft.name}” saved`);
        } else {
          const created = await createAccessPresetAction({ name: draft.name, description: draft.description, permissions: draft.permissions });
          setSelectedId(created.id);
          setDraft((d) => ({ ...d, id: created.id }));
          toast.success(`Preset “${created.name}” created`);
        }
      } catch (err) {
        toast.error(errorMessage(err, "Preset not saved. Try again."));
      }
    });
  };

  const remove = () => {
    if (!draft.id) return;
    startTransition(async () => {
      try {
        await deleteAccessPresetAction(draft.id!);
        toast.success(`Preset “${draft.name}” deleted`);
        setConfirmDelete(false);
        select(presets.find((p) => p.id !== draft.id) ?? null);
      } catch (err) {
        toast.error(errorMessage(err, "Preset not deleted. Try again."));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLE_SUMMARY.map((r) => (
          <div key={r.name} className="rounded-xl border border-border/70 p-4 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-medium">{r.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Access Presets</h3>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => select(null)}>
              <Plus className="h-3.5 w-3.5" /> New Preset
            </Button>
          </div>
          {presets.length === 0 && <p className="text-xs text-muted-foreground">No presets yet. Create one, e.g. HR.</p>}
          <ul className="space-y-1">
            {presets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                    p.id === selectedId ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{p._count.members}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-5 rounded-xl border border-border/70 p-5 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="preset-name" className="text-xs font-semibold text-muted-foreground">Name</label>
              <Input id="preset-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. HR" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="preset-desc" className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input id="preset-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this preset is for" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.label} className="space-y-1.5">
                <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</legend>
                {group.items.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={draft.permissions.includes(item.id)} onCheckedChange={() => togglePermission(item.id)} disabled={isPending} />
                    {item.label}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
            <div className="text-xs text-muted-foreground">
              {selected ? (
                <>Used by <Badge variant="outline" className="text-[10px]">{selected._count.members}</Badge> {selected._count.members === 1 ? "person" : "people"}. Changes apply to all of them.</>
              ) : (
                "Assign presets to people from their profile page."
              )}
            </div>
            <div className="flex gap-2">
              {draft.id && (
                <Button variant="ghost" size="sm" className="gap-1 text-red-600" onClick={() => setConfirmDelete(true)} disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete Preset
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={isPending || !draft.name.trim()}>
                {isPending ? "Saving…" : draft.id ? "Save Preset" : "Create Preset"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset “{draft.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?._count.members ? `${selected._count.members} ${selected._count.members === 1 ? "person loses" : "people lose"} the permissions it gives. ` : ""}
              Personal permissions are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Preset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
