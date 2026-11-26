"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type FacetOption = { value: string; label: string; icon?: React.ReactNode; count?: number };

/**
 * One filter as its own button: pick any number of values from a searchable
 * list. Shows its icon, and once set, what's picked ("High, Critical" / "3 projects").
 */
export function FacetFilter({
  label,
  icon,
  options,
  selected,
  onChange,
  plural,
  searchable = true,
  pinned,
}: {
  label: string;
  icon: React.ReactNode;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** "projects", "people": used for the "3 projects" summary. */
  plural: string;
  searchable?: boolean;
  /** Options shown first, above a divider (e.g. "Me", "Unassigned"). */
  pinned?: FacetOption[];
}) {
  const [open, setOpen] = useState(false);
  const all = [...(pinned ?? []), ...options];
  const picked = all.filter((o) => selected.includes(o.value));
  const summary = picked.length === 0 ? null : picked.length <= 2 ? picked.map((p) => p.label).join(", ") : `${picked.length} ${plural}`;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const item = (o: FacetOption) => {
    const on = selected.includes(o.value);
    return (
      <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)} className="gap-2">
        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border", on ? "border-foreground bg-foreground text-background" : "border-border")}>
          {on && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        {o.icon}
        <span className="flex-1 truncate">{o.label}</span>
        {o.count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>}
      </CommandItem>
    );
  };

  return (
    <div className={cn("flex h-8 shrink-0 items-center rounded-md border text-sm transition-colors", picked.length ? "border-foreground/25 bg-muted" : "border-border bg-background hover:bg-muted/60")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-full items-center gap-1.5 rounded-md pl-2.5 pr-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`Filter by ${label}`}>
            <span className="text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
            <span className={cn(picked.length ? "text-muted-foreground" : "")}>{label}</span>
            {summary && <span className="max-w-[160px] truncate font-medium">{summary}</span>}
            {!summary && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            {searchable && <CommandInput placeholder={`Search ${plural}…`} />}
            <CommandList className="max-h-72">
              <CommandEmpty>Nothing found.</CommandEmpty>
              {pinned && pinned.length > 0 && (
                <>
                  <CommandGroup>{pinned.map(item)}</CommandGroup>
                  <CommandSeparator />
                </>
              )}
              <CommandGroup>{options.map(item)}</CommandGroup>
            </CommandList>
            {selected.length > 0 && (
              <div className="border-t border-border/60 p-1">
                <button type="button" onClick={() => onChange([])} className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  Clear {label.toLowerCase()} filter
                </button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      {picked.length > 0 && (
        <button type="button" onClick={() => onChange([])} aria-label={`Clear ${label} filter`} className="mr-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
