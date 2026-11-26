"use client";

import { useEffect } from "react";

/**
 * Fades out the installed-app launch screen (#app-splash) once the app has
 * started. It's only hidden, not removed: React rendered it, so React keeps it.
 */
export function SplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("app-splash");
    if (splash) splash.dataset.done = "";
  }, []);
  return null;
}
