"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";

export function DashboardHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="secondary" 
        size="sm" 
        className="gap-2 text-xs"
        onClick={() => document.dispatchEvent(new CustomEvent("open-submit-update"))}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Submit Update
      </Button>
      <Button asChild size="sm" className="gap-2 text-xs">
        <Link href="/tasks">
          <Plus className="h-3.5 w-3.5" />
          Quick Action
        </Link>
      </Button>
    </div>
  );
}
