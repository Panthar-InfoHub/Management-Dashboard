"use client";
import { Checkbox } from "@/components/ui/checkbox";

import { useMemo, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PERMISSION_GROUPS } from "@/lib/permission-list";
import { setEmployeePermissionsAction, setEmployeePresetsAction } from "@/lib/actions/access.actions";
import { errorMessage } from "@/lib/utils";

export type PresetOption = { id: string; name: string; description: string | null; permissions: string[] };

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Admin-only: give one person presets (e.g. HR) and individual permissions. */
export function EmployeeAccessPanel({
  employeeId,
  presets,
  assignedPresetIds,
  personalPermissions,
}: {
  employeeId: string;
  presets: PresetOption[];
  assignedPresetIds: string[];
  personalPermissions: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [presetIds, setPresetIds] = useState(assignedPresetIds);
  const [permissions, setPermissions] = useState(personalPermissions);

  // Permissions already covered by the selected presets show as included.
  const fromPresets = useMemo(
    () => new Set(presets.filter((p) => presetIds.includes(p.id)).flatMap((p) => p.permissions)),
    [presets, presetIds]
  );

  const dirty = !sameSet(presetIds, assignedPresetIds) || !sameSet(permissions, personalPermissions);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = () => {
    startTransition(async () => {
      try {
        if (!sameSet(presetIds, assignedPresetIds)) await setEmployeePresetsAction(employeeId, presetIds);
        if (!sameSet(permissions, personalPermissions)) {
          await setEmployeePermissionsAction({ employeeId, permissions: permissions.filter((p) => !fromPresets.has(p)) });
        }
        toast.success("Access updated");
      } catch (err) {
        toast.error(errorMessage(err, "Access not updated. Try again."));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Access</h3>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" disabled={isPending} onClick={() => { setPresetIds(assignedPresetIds); setPermissions(personalPermissions); }}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || isPending}>{isPending ? "Saving…" : "Save Access"}</Button>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Presets</h4>
        {presets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No presets yet. Create one in Settings → Access Presets.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((p) => (
              <label key={p.id} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/30">
                <Checkbox className="mt-0.5" checked={presetIds.includes(p.id)} onCheckedChange={() => setPresetIds((ids) => toggle(ids, p.id))} disabled={isPending} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.description || `${p.permissions.length} permissions`}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">Extra permissions</h4>
          <p className="text-xs text-muted-foreground">Company-wide, on top of presets. Team and project leads already manage what they lead.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.label} className="space-y-1.5">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</legend>
              {group.items.map((item) => {
                const included = fromPresets.has(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={included || permissions.includes(item.id)} disabled={included || isPending} onCheckedChange={() => setPermissions((list) => toggle(list, item.id))} />
                    <span className={included ? "text-muted-foreground" : undefined}>{item.label}</span>
                    {included && <Badge variant="outline" className="text-[9px] px-1.5 py-0">preset</Badge>}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </section>
    </div>
  );
}
