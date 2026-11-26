import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { getInbox } from "@/lib/leave/queries";
import { ApprovalsInbox } from "@/components/leave/approvals-inbox";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Requests from your people that need a decision.</p>
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
