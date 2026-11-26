import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsBodySkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-60" /></div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[268px] rounded-xl" />)}
      </div>
    </div>
  );
}

export default function ProjectsLoading() {
  return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6"><ProjectsBodySkeleton /></div>;
}
