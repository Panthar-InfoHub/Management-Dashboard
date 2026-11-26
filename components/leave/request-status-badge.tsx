import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS, type RequestStatusValue } from "@/lib/leave/rules";

const STYLES: Record<RequestStatusValue, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  CANCELLED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function RequestStatusBadge({ status }: { status: RequestStatusValue }) {
  return <Badge variant="outline" className={cn("text-[10px] font-medium", STYLES[status])}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}
