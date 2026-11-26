"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/**
 * Choose any number of teams (or none): chosen teams show as chips with a
 * remove button; "Add Team" opens a searchable list of the rest.
 */
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
  /** Teams that can't be removed here (e.g. one they lead), with a note. */
  lockedIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  if (teams.length === 0) return <p className="text-xs text-muted-foreground">No teams yet. Create one on the Teams page.</p>;

  const chosen = teams.filter((t) => value.includes(t.id));
  const rest = teams.filter((t) => !value.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((t) => {
        const locked = lockedIds.includes(t.id);
        return (
          <span key={t.id} className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background pl-2.5 pr-1 text-sm">
            {t.name}
            {locked ? (
              <span className="px-1 text-[11px] text-muted-foreground">Lead</span>
            ) : (
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== t.id))}
                disabled={disabled}
                aria-label={`Remove ${t.name}`}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}
      {rest.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 border-dashed text-xs" disabled={disabled}>
              <Plus className="h-3 w-3" /> {chosen.length ? "Add Team" : "Choose Teams"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <Command>
              <CommandInput placeholder="Search teams…" />
              <CommandList>
                <CommandEmpty>No teams found.</CommandEmpty>
                {rest.map((t) => (
                  <CommandItem key={t.id} value={t.name} onSelect={() => { onChange([...value, t.id]); setOpen(false); }}>
                    {t.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {chosen.length === 0 && rest.length === 0 && <span className="text-xs text-muted-foreground">No teams</span>}
    </div>
  );
}
