import { Skeleton } from "@/components/ui/skeleton";

export function TeamsBodySkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pr-2">
      <div className="flex justify-end mb-6">
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col rounded-xl border border-border/40 bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex -space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamsLoading() {
  return (
    <div className="space-y-6 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between pb-6 border-b border-border/40 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage functional groups and track project assignments.</p>
        </div>
      </div>
      <TeamsBodySkeleton />
    </div>
  );
}
