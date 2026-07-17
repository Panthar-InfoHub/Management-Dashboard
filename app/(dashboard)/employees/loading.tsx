import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-[200px] sm:w-72" />
        </div>
        <Skeleton className="h-8 w-full sm:w-40" />
      </div>

      {/* Overview Blocks */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
            <div className="flex items-center gap-4 border-b border-border/40 p-5">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Priority Panels */}
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card shadow-sm">
            <div className="space-y-2 border-b border-border/40 p-5">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <div className="w-full space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[320px] space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-[240px] w-full rounded-md" />
        </div>
        <div className="h-[320px] space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-[240px] w-full rounded-md" />
        </div>
        <div className="h-[320px] space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-[240px] w-full rounded-md" />
        </div>
      </div>

      {/* Projects Summary */}
      <div className="space-y-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
