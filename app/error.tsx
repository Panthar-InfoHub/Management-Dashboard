"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const isInviteError = error.message.includes("INVITATION_REQUIRED");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-muted/10 p-10 rounded-2xl border border-border/40">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isInviteError ? "Access Denied" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isInviteError 
              ? "This platform is strictly invite-only. You must be explicitly added to the team roster by an administrator before you can access the dashboard using this account."
              : "An unexpected error occurred while trying to load this page."}
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          {isInviteError ? (
            <SignOutButton>
              <Button className="w-full">Sign out & Try another account</Button>
            </SignOutButton>
          ) : (
            <Button onClick={() => reset()} className="w-full">
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
