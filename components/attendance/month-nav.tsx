import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/attendance/calendar";
import { LinkPending } from "@/components/ui/link-pending";

export function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthTitle(monthKey: string) {
  return fromDateKey(`${monthKey}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Previous / next month links (no future months). `href` builds the URL for a month. */
export function MonthNav({ monthKey, currentMonth, href }: { monthKey: string; currentMonth: string; href: (month: string | null) => string }) {
  const atCurrent = monthKey >= currentMonth;
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous month">
        <Link href={href(shiftMonth(monthKey, -1))} className="relative"><ChevronLeft className="h-4 w-4" /><LinkPending className="absolute -top-0.5 -right-0.5 size-2" /></Link>
      </Button>
      <h2 className="w-40 text-center text-sm font-medium">{monthTitle(monthKey)}</h2>
      <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Next month">
        <Link href={href(shiftMonth(monthKey, 1))} aria-disabled={atCurrent} tabIndex={atCurrent ? -1 : undefined} className={cn("relative", atCurrent && "pointer-events-none opacity-40")}>
          <ChevronRight className="h-4 w-4" />
          <LinkPending className="absolute -top-0.5 -right-0.5 size-2" />
        </Link>
      </Button>
      {monthKey !== currentMonth && (
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs"><Link href={href(null)}>This Month<LinkPending /></Link></Button>
      )}
    </div>
  );
}
