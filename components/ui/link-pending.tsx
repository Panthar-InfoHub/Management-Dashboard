"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * A small spinner shown inside a <Link> while its page is loading, so a click
 * gets feedback right where it happened. Must be rendered inside the Link.
 * It fades in after a short delay, so fast navigations don't flicker.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3 shrink-0 rounded-full border-[1.5px] border-current border-r-transparent opacity-0 transition-opacity motion-safe:animate-spin",
        pending ? "opacity-60 delay-100" : "invisible",
        className,
      )}
    />
  );
}
