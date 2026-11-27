import { Suspense } from "react";
import { connection } from "next/server";
import { Plane } from "lucide-react";
import { getCurrentEmployee } from "@/lib/auth";
import { getMyLeave } from "@/lib/leave/queries";
import { RequestDialog } from "@/components/leave/request-dialog";
import { MyRequests } from "@/components/leave/my-requests";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function LeavePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your leave balance and leave requests. WFH, late arrival and time correction requests are on My Attendance.</p>
      </div>
      <Suspense fallback={<LeaveSkeleton />}>
        <LeaveBody />
      </Suspense>
    </div>
  );
}

function LeaveSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

async function LeaveBody() {
  await connection();
  const leave = await getMyLeave(await getCurrentEmployee());
  if (!leave) {
    return <EmptyState icon={Plane} title="Leave isn't tracked for Super Admins" description="Approve other people's requests from Approvals." />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Balance {leave.year}</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {leave.balances.map((b) => (
            <div key={b.leaveTypeId} className="rounded-xl border border-border/70 p-4 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
              <dt className="text-xs text-muted-foreground">{b.name}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {b.unlimited ? "No limit" : (b.available ?? 0) < 0
                  ? <span className="text-destructive">{Math.abs(b.available ?? 0)} days over</span>
                  : b.available}
              </dd>
              {!b.unlimited && (
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {b.allowed} allowed{b.adjusted ? ` ${b.adjusted > 0 ? "+" : "−"} ${Math.abs(b.adjusted)} adjusted` : ""} · {b.used} used{b.pending ? ` · ${b.pending} pending` : ""}
                </p>
              )}
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">My Leave Requests</h2>
          <RequestDialog kind="LEAVE" leaveTypes={leave.balances} today={leave.today} />
        </div>
        <MyRequests requests={leave.requests} emptyText="No leave requests yet. Use Apply for Leave to send one." />
      </section>
    </div>
  );
}
