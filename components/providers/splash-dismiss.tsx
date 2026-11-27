"use client";

import { useEffect } from "react";

/**
 * Fades out the installed-app launch screen (#app-splash) once the app has
 * started. It's only hidden, not removed: React rendered it, so React keeps it.
 * Also drops the `_launch` mark that public/launch.html adds to the address on
 * a cold start, so it isn't kept in links or refreshes.
 */
export function SplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("app-splash");
    if (splash) splash.dataset.done = "";

    const url = new URL(window.location.href);
    if (url.searchParams.has("_launch")) {
      url.searchParams.delete("_launch");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  return null;
}
