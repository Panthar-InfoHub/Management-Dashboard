"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ClipboardCheck, FolderKanban, Inbox, LayoutDashboard, ListTodo, Menu, Plane, type LucideIcon } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";
import { LinkPending } from "@/components/ui/link-pending";

type Tab = { label: string; href: string; icon: LucideIcon };

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/tasks") return pathname === "/tasks" || (pathname.startsWith("/tasks/") && !pathname.startsWith("/tasks/my"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Phone-only tab bar for the places people open every day; "More" opens the
 * full menu. Hidden from tablet width up, where the sidebar shows.
 */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const access = useAccess();
  // Super Admins don't clock in or take leave; approvers get their inbox.
  const tracked = access.role !== "SUPER_ADMIN";
  const canApprove = access.can("leave:approve") || access.leadsTeam;

  const tabs: Tab[] = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "My Tasks", href: "/tasks/my", icon: ListTodo },
    tracked ? { label: "Attendance", href: "/attendance", icon: CalendarClock } : { label: "Board", href: "/tasks", icon: ClipboardCheck },
    canApprove
      ? { label: "Approvals", href: "/approvals", icon: Inbox }
      : tracked ? { label: "Leave", href: "/leave", icon: Plane } : { label: "Projects", href: "/projects", icon: FolderKanban },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <LinkPending className="absolute top-2.5 right-[calc(50%-18px)] size-2" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
