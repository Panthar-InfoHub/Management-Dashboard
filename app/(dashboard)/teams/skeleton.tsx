import { Skeleton } from "@/components/ui/skeleton";

export function TeamsBodySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-56" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[214px] rounded-xl" />)}
      </div>
    </div>
  );
}

export default function TeamsLoading() {
  return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6"><TeamsBodySkeleton /></div>;
}
