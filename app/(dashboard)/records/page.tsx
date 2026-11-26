import { Suspense } from "react";
import { checkPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RecordsClient } from "@/components/records/records-client";
import { db } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecordsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employment Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">Company-wide ledger of roles, promotions, and offboarding.</p>
        </div>
      </div>
      <Suspense fallback={<RecordsLoading />}>
        <RecordsDataAsync />
      </Suspense>
    </div>
  );
}

function RecordsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

async function RecordsDataAsync() {
  if (!(await checkPermission("employee:view-all"))) {
    redirect("/employees");
  }

  const records = await db.employmentRecord.findMany({
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true }
      }
    },
    orderBy: { startDate: "desc" }
  });

  return (
    <RecordsClient 
      records={JSON.parse(JSON.stringify(records))} 
    />
  );
}
