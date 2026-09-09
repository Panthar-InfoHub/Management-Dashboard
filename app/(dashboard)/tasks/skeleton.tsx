import { Skeleton } from "@/components/ui/skeleton";

export function TasksBodySkeleton() {
  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div className="flex items-center justify-end shrink-0">
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="flex items-center gap-3 w-full shrink-0">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-24 shrink-0" />
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 overflow-hidden mt-4">
        {[1, 2, 3, 4, 5, 6].map((col) => (
          <div key={col} className="flex flex-col gap-3 min-h-0 bg-muted/20 p-2 rounded-lg">
            <Skeleton className="h-8 w-full" />
            <div className="flex flex-col gap-2 overflow-hidden">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)] min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and manage all tasks across projects.</p>
        </div>
      </div>
      <TasksBodySkeleton />
    </div>
  );
}
