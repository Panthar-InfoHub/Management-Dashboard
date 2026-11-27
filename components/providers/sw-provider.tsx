"use client";

import { useEffect } from "react";

/**
 * The service worker (offline page, cached build files) runs in production
 * only. In development, build files keep the same name while their contents
 * change, so a cached copy would run old code against new server HTML
 * (hydration errors). There, any worker from an earlier visit is removed with
 * its caches.
 */
export function SWProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ("caches" in window) {
        caches.keys().then((keys) => keys.filter((k) => k.startsWith("panthar-")).forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Without the worker the app still works; it just has no offline page.
    });
  }, []);

  return null;
}
