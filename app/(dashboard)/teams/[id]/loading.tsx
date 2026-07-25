import { Skeleton } from "@/components/ui/skeleton";

export default function TeamDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[250px] w-full rounded-xl" />
        <Skeleton className="h-[250px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
}
