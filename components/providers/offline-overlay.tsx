"use client";

import { useEffect, useState } from "react";

export function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center gap-8 p-8 text-center max-w-md">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
          <img 
            src="/images/black_logo.webp" 
            alt="Panthar Logo" 
            className="h-8 w-8 object-contain" 
          />
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
