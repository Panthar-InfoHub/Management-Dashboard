import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailLoading() {
  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Breadcrumb & Actions Bar (Sticky Top) */}
      <div className="px-4 md:px-8 py-3 md:py-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10 gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 hidden sm:block" />
          <Skeleton className="h-3 w-3 hidden sm:block rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Main Content Area & Right Rail */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-8 md:gap-12 items-start">
          {/* Left Main Column */}
          <div className="space-y-8 min-w-0">
            <div>
              <Skeleton className="h-8 w-3/4 mb-4" />
              <div className="flex items-center gap-4 mb-8">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-2.5 mb-8">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>

            {/* Blockers */}
            <div className="pt-6 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Subtasks */}
            <div className="pt-6 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </div>

          {/* Right Sidebar (280px rail) */}
          <div className="space-y-6 shrink-0 w-full md:w-[280px]">
            <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-5">
              <Skeleton className="h-4 w-20 mb-3" />
              
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-36" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
