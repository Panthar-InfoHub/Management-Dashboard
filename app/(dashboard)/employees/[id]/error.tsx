"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EmployeeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Employee Detail Error]", error);
  }, [error]);

  const isForbidden =
    error.message.includes("FORBIDDEN") ||
    error.message.includes("Unauthorized");

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">
        {isForbidden ? "Access Denied" : "Failed to load profile"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {isForbidden
          ? "You don't have permission to view this employee's profile."
          : "Something went wrong while loading this profile. Please try again."}
      </p>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
          </Link>
        </Button>
        {!isForbidden && (
          <Button onClick={reset}>Try Again</Button>
        )}
      </div>
    </div>
  );
}
