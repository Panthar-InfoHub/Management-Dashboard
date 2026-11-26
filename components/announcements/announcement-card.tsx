import { Pin } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnnouncementView } from "@/lib/queries/announcement.queries";

/** One announcement. Plain text with line breaks kept (no HTML). */
export function AnnouncementCard({ a, compact = false, actions }: { a: AnnouncementView; compact?: boolean; actions?: React.ReactNode }) {
  const date = new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <article className={cn("rounded-xl border border-border/40 bg-card", compact ? "p-4" : "p-5", a.expired && "opacity-60")}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {a.pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Pinned" />}
            {a.title}
            {a.expired && <Badge variant="outline" className="text-[10px]">Ended</Badge>}
          </h3>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar className="h-4 w-4" user={a.author} textClassName="text-[8px]" />
            {a.author.name} · {date}{a.edited ? " · edited" : ""} · {a.audience}
            {a.expiresAt && !a.expired && <> · until {new Date(`${a.expiresAt}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</>}
          </p>
        </div>
        {actions}
      </header>
      <p className={cn("mt-3 whitespace-pre-wrap break-words text-sm text-foreground/90", compact && "line-clamp-3")}>{a.body}</p>
    </article>
  );
}
