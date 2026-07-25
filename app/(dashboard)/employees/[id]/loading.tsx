import { Skeleton } from "@/components/ui/skeleton";

export default function DetailLoading() {
  return (
    <div className="space-y-6 p-6 md:p-8 w-full h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
