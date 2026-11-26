"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineOverlay() {
  // The server render always assumes online.
  const isOffline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center gap-8 p-8 text-center max-w-md">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
          <Image src="/images/black_logo.webp" alt="Panthar Logo" width={32} height={32} className="h-8 w-8 object-contain" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-medium tracking-tight">You are offline</h1>
          <p className="text-sm text-muted-foreground">Please check your internet connection.</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
