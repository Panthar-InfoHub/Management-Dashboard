import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsBodySkeleton() {
  return (
    <div className="flex flex-col gap-6 min-w-0 flex-1 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end shrink-0 gap-4">
        <Skeleton className="h-9 w-full sm:w-28" />
      </div>

      <div className="flex items-center gap-3 w-full shrink-0">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-[130px] shrink-0" />
        <Skeleton className="h-9 w-[130px] shrink-0" />
      </div>

      <div className="mt-4 flex-1">
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-1.5 w-full" />
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex -space-x-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)] min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage and track all active projects across your organization.</p>
        </div>
      </div>
      <ProjectsBodySkeleton />
    </div>
  );
}
