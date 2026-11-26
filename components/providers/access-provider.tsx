"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMyAccessAction } from "@/lib/actions/me.actions";

export type MyAccess = Awaited<ReturnType<typeof getMyAccessAction>>;

const AccessContext = createContext<MyAccess | null>(null);

/**
 * Loads the signed-in person's role and permissions from the database once,
 * after the static shell paints. Used only to show or hide navigation; every
 * server action checks access itself. The shell layout stays mounted across
 * navigations, so this runs once per page load.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<MyAccess | null>(null);

  useEffect(() => {
    let alive = true;
    getMyAccessAction().then((a) => alive && setAccess(a)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return <AccessContext value={access}>{children}</AccessContext>;
}

export function useAccessContext() {
  return useContext(AccessContext);
}
