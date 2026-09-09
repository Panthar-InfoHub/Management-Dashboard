"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Unable to load dashboard data
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {error.message && !error.message.includes("digest")
          ? error.message
          : "An unexpected error occurred while loading this section. Please try again."}
      </p>
      <Button onClick={() => reset()} variant="outline" size="sm" className="gap-2 text-xs">
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}
