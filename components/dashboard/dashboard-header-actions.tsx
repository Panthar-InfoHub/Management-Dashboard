"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export function DashboardHeaderActions({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <>
          <Button asChild variant="secondary" size="sm" className="gap-2 text-xs">
            <Link href="/projects/new">
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2 text-xs">
            <Link href="/tasks/new">
              <Plus className="h-3.5 w-3.5" />
              New Task
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
