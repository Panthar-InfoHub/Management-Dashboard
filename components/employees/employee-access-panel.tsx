"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PERMISSION_GROUPS } from "@/lib/permission-list";
import { setEmployeePermissionsAction, setEmployeePresetsAction } from "@/lib/actions/access.actions";
import { errorMessage } from "@/lib/utils";

export type PresetOption = { id: string; name: string; description: string | null; permissions: string[] };

const TOTAL = PERMISSION_GROUPS.reduce((n, g) => n + g.items.length, 0);

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Which presets grant each permission, for the selected presets. */
function presetSources(presets: PresetOption[], ids: string[]) {
  const map = new Map<string, string[]>();
  for (const p of presets) {
    if (!ids.includes(p.id)) continue;
    for (const perm of p.permissions) map.set(perm, [...(map.get(perm) ?? []), p.name]);
  }
  return map;
}

/**
 * Admin-only access for one person. The page shows a short summary; changes
 * happen in a dialog: add presets from the list, then fine-tune single permissions.
 */
export function EmployeeAccessPanel({
  employeeId,
  employeeName,
  presets,
  assignedPresetIds,
  personalPermissions,
}: {
  employeeId: string;
  employeeName: string;
  presets: PresetOption[];
  assignedPresetIds: string[];
  personalPermissions: string[];
}) {
  const [open, setOpen] = useState(false);
  const saved = presetSources(presets, assignedPresetIds);
  const effective = new Set([...saved.keys(), ...personalPermissions]);
  const assigned = presets.filter((p) => assignedPresetIds.includes(p.id));
  const extra = personalPermissions.filter((p) => !saved.has(p));

  return (
    <div className="space-y-3">
      {assigned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assigned.map((p) => (
            <span key={p.id} className="rounded-md border border-border/70 bg-background px-2 py-0.5 text-xs font-medium">{p.name}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No presets yet.</p>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">{effective.size}</span> of {TOTAL} permissions
        {extra.length > 0 && <> · {extra.length} given individually</>}
      </p>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>Manage Permissions</Button>
      {open && (
        <ManageDialog
          open={open}
          onOpenChange={setOpen}
          employeeId={employeeId}
          employeeName={employeeName}
          presets={presets}
          assignedPresetIds={assignedPresetIds}
          personalPermissions={personalPermissions}
        />
      )}
    </div>
  );
}

function ManageDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  presets,
  assignedPresetIds,
  personalPermissions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  employeeName: string;
  presets: PresetOption[];
  assignedPresetIds: string[];
  personalPermissions: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [presetIds, setPresetIds] = useState(assignedPresetIds);
  const [permissions, setPermissions] = useState(personalPermissions);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sources = useMemo(() => presetSources(presets, presetIds), [presets, presetIds]);
  const selected = presets.filter((p) => presetIds.includes(p.id));
  const available = presets.filter((p) => !presetIds.includes(p.id));
  const effectiveCount = new Set([...sources.keys(), ...permissions]).size;
  const dirty = !sameSet(presetIds, assignedPresetIds) || !sameSet(permissions, personalPermissions);

  const toggle = (id: string) => setPermissions((list) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]));

  const save = () => {
    startTransition(async () => {
      try {
        if (!sameSet(presetIds, assignedPresetIds)) await setEmployeePresetsAction(employeeId, presetIds);
        const own = permissions.filter((p) => !sources.has(p));
        if (!sameSet(own, personalPermissions)) await setEmployeePermissionsAction({ employeeId, permissions: own });
        toast.success(`Permissions updated for ${employeeName}`);
        onOpenChange(false);
      } catch (err) {
        toast.error(errorMessage(err, "Permissions not updated. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            What {employeeName} can do across the company. Team and project leads already manage what they lead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Presets */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Presets</h3>
                <p className="text-xs text-muted-foreground">Ready-made bundles, managed in Settings → Access Presets.</p>
              </div>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={isPending || available.length === 0}>
                    <Plus className="h-3.5 w-3.5" /> Add Preset
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <Command>
                    <CommandInput placeholder="Search presets…" />
                    <CommandList>
                      <CommandEmpty>No presets found.</CommandEmpty>
                      {available.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => { setPresetIds((ids) => [...ids, p.id]); setPickerOpen(false); }}
                          className="flex-col items-start gap-0.5"
                        >
                          <span className="text-sm font-medium">{p.name}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {p.description || "No description"} · {p.permissions.length} permissions
                          </span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {presets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                No presets yet. Create one in Settings → Access Presets.
              </p>
            ) : selected.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                No presets added. Use Add Preset to give a ready-made bundle.
              </p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
                {selected.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.description || `${p.permissions.length} permissions`}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      aria-label={`Remove ${p.name}`}
                      disabled={isPending}
                      onClick={() => setPresetIds((ids) => ids.filter((id) => id !== p.id))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* All permissions */}
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">All Permissions</h3>
                <p className="text-xs text-muted-foreground">Ones from a preset are locked; tick others to give them individually.</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{effectiveCount} of {TOTAL}</span>
            </div>
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <fieldset key={group.label}>
                  <legend className="mb-1 text-xs font-medium text-muted-foreground">{group.label}</legend>
                  <div className="divide-y divide-border/50 rounded-lg border border-border/70">
                    {group.items.map((item) => {
                      const from = sources.get(item.id);
                      const checked = !!from || permissions.includes(item.id);
                      return (
                        <label key={item.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${from ? "" : "cursor-pointer hover:bg-muted/40"}`}>
                          <Checkbox checked={checked} disabled={!!from || isPending} onCheckedChange={() => toggle(item.id)} />
                          <span className={`flex-1 ${from ? "text-muted-foreground" : ""}`}>{item.label}</span>
                          {from && <span className="shrink-0 text-[11px] text-muted-foreground">via {from.join(", ")}</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="m-0 rounded-b-xl border-t border-border/60 px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={save} disabled={!dirty || isPending}>{isPending ? "Saving…" : "Save Permissions"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
