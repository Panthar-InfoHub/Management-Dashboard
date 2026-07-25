import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-5">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  );
}
