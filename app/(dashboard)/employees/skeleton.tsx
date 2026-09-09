import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesBodySkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <Skeleton className="h-9 w-full sm:w-32" />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex-1 max-w-md">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="w-[180px]">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      <div className="border border-border/40 rounded-lg overflow-hidden bg-background flex-1 flex flex-col">
        <div className="bg-muted/20 border-b border-border/40 p-3 flex gap-4 shrink-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 border-b border-border/20 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="space-y-2 flex-1 hidden sm:block">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EmployeesLoading() {
  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto selection:bg-primary/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Organization Members</h1>
          <p className="text-sm text-muted-foreground">Manage members and their platform access.</p>
        </div>
      </div>
      <EmployeesBodySkeleton />
    </div>
  );
}
