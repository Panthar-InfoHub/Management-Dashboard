"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RouteSkeleton } from "@/components/layout/route-skeleton";

// Navigation feedback in the page, not on the link. When a nav link is
// clicked, the main area shows that route's skeleton at once and the link is
// highlighted, while the router fetches the page (always in `next dev`, which
// never prefetches, and in production when a prefetch hasn't landed yet). It
// clears as soon as the new URL commits.

type NavPending = {
  pendingHref: string | null;
  /** Use as (or inside) a nav Link's onClick. */
  start: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
};

const NavPendingContext = createContext<NavPending>({ pendingHref: null, start: () => {} });

export function useNavPending() {
  return useContext(NavPendingContext);
}

/** If navigation fails without changing the URL, don't hide the page forever. */
const GIVE_UP_MS = 15_000;

function PathnameWatcher({ onPath }: { onPath: (pathname: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onPath(pathname), [pathname, onPath]);
  return null;
}

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setPendingHref(null);
  }, []);

  const onPath = useCallback((pathname: string) => {
    pathRef.current = pathname;
    clear();
  }, [clear]);

  const start = useCallback((href: string, event: MouseEvent<HTMLAnchorElement>) => {
    // New tab, new window or download: this page isn't navigating.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href === pathRef.current) return;
    clearTimeout(timer.current);
    setPendingHref(href);
    timer.current = setTimeout(() => setPendingHref(null), GIVE_UP_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <NavPendingContext value={{ pendingHref, start }}>
      <Suspense fallback={null}><PathnameWatcher onPath={onPath} /></Suspense>
      {children}
    </NavPendingContext>
  );
}

/**
 * The page, or the destination's skeleton while a nav link is pending. The
 * current page stays mounted (hidden) so nothing is lost if navigation stalls.
 */
export function NavPendingOutlet({ children }: { children: ReactNode }) {
  const { pendingHref } = useNavPending();
  return (
    <>
      {pendingHref && <RouteSkeleton href={pendingHref} />}
      <div className={pendingHref ? "hidden" : "contents"}>{children}</div>
    </>
  );
}
