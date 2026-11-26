"use client";

import { useState, useTransition } from "react";
import { Eye, X } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAccessContext } from "@/components/providers/access-provider";
import { listViewAsOptionsAction, setViewAsAction } from "@/lib/actions/me.actions";
import { ROLE_LABELS, type AccessRole } from "@/lib/access";

type Option = Awaited<ReturnType<typeof listViewAsOptionsAction>>[number];

/** Local development only: switch the whole app to another employee's view. */
export function ViewAsBar() {
  const access = useAccessContext();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    if (options) return;
    listViewAsOptionsAction().then(setOptions).catch(() => setOptions([]));
  };

  const switchTo = (id: string | null) => {
    startTransition(async () => {
      await setViewAsAction(id);
      // A full reload so every server component and cached access re-reads.
      window.location.reload();
    });
  };

  if (!access) return null;
  const roles: AccessRole[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <Eye className="h-3.5 w-3.5 text-amber-600" aria-hidden />
      <span className="text-muted-foreground">Dev · Viewing as</span>
      <Select onOpenChange={(open) => open && load()} onValueChange={switchTo} disabled={isPending}>
        <SelectTrigger className="h-7 w-[220px] text-xs">
          <SelectValue placeholder={`${access.name} (${ROLE_LABELS[access.role as AccessRole] ?? access.role})`} />
        </SelectTrigger>
        <SelectContent>
          {options === null && <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>}
          {roles.map((role) => {
            const people = (options ?? []).filter((o) => o.role === role);
            if (people.length === 0) return null;
            return (
              <SelectGroup key={role}>
                <SelectLabel className="text-[10px] uppercase tracking-wider">{ROLE_LABELS[role]}</SelectLabel>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.firstName} {p.lastName}{p.designation ? ` · ${p.designation}` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
      {access.viewingAs && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => switchTo(null)} disabled={isPending}>
          <X className="h-3 w-3" /> Back to Me
        </Button>
      )}
    </div>
  );
}
