"use client";
import { Checkbox } from "@/components/ui/checkbox";

/** Tick any number of teams (or none). */
export function TeamPicker({
  teams,
  value,
  onChange,
  disabled,
  lockedIds = [],
}: {
  teams: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Teams that can't be unticked here (e.g. one they lead), with a note. */
  lockedIds?: string[];
}) {
  if (teams.length === 0) return <p className="text-xs text-muted-foreground">No teams yet. Create one on the Teams page.</p>;
  return (
    <div className="max-h-44 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
      {teams.map((t) => {
        const checked = value.includes(t.id);
        const locked = lockedIds.includes(t.id);
        return (
          <label key={t.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40">
            <Checkbox checked={checked} disabled={disabled || locked} onCheckedChange={() => onChange(checked ? value.filter((id) => id !== t.id) : [...value, t.id])} />
            <span className="truncate">{t.name}</span>
            {locked && <span className="ml-auto text-[10px] text-muted-foreground">leads this team</span>}
          </label>
        );
      })}
    </div>
  );
}
