import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { getInbox } from "@/lib/leave/queries";
import { ApprovalsInbox } from "@/components/leave/approvals-inbox";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">Leave, WFH and attendance-fix requests, and late half days to review. Your own requests go to someone else.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-lg" />}>
        <InboxBody />
      </Suspense>
    </div>
  );
}

async function InboxBody() {
  const inbox = await getInbox(await getCurrentEmployee());
  if (!inbox) redirect("/leave");
  return <ApprovalsInbox inbox={inbox} />;
}
