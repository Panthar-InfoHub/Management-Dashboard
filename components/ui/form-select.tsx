"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all";

/**
 * A Select for plain forms (e.g. GET filter forms): submits `name` with the
 * chosen value, or an empty value for the "all" option.
 */
export function FormSelect({
  name,
  defaultValue,
  options,
  allLabel,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  /** Label for the empty choice, e.g. "All". */
  allLabel: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [value, setValue] = React.useState(defaultValue || ALL);
  return (
    <>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className={cn("min-w-32", className)} aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value === ALL ? "" : value} />
    </>
  );
}
