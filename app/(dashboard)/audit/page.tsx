import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { isAdminRole, isSuperAdmin } from "@/lib/access";
import { getAuditPage, type AuditFilters } from "@/lib/queries/audit.queries";
import { PruneAuditButton } from "@/components/audit/prune-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSelect } from "@/components/ui/form-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ParamsSuspense } from "@/components/ui/params-suspense";

export default function AuditPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Who changed what, and when. Newest first.</p>
      </div>
      <ParamsSuspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
        <AuditBody searchParams={searchParams} />
      </ParamsSuspense>
    </div>
  );
}

/** "status: TODO → DONE", "permissions: 3 items", … one line per field. */
function describe(changes: unknown): string[] {
  if (changes == null || typeof changes !== "object") return changes == null ? [] : [String(changes)];
  const short = (v: unknown) => {
    if (v == null) return "—";
    if (Array.isArray(v)) return v.length > 3 ? `${v.length} items` : v.map((x) => (typeof x === "object" ? "…" : String(x))).join(", ") || "none";
    if (typeof v === "object") return "…";
    const s = String(v);
    return s.length > 60 ? `${s.slice(0, 57)}…` : s;
  };
  return Object.entries(changes as Record<string, unknown>).map(([k, v]) =>
    Array.isArray(v) && v.length === 2 && !Array.isArray(v[0]) ? `${k}: ${short(v[0])} → ${short(v[1])}` : `${k}: ${short(v)}`
  );
}

async function AuditBody({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  const [me, filters] = await Promise.all([getCurrentEmployee(), searchParams]);
  if (!isAdminRole(me.role)) redirect("/");
  const data = await getAuditPage(filters);

  const keep = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== "before") as [string, string][]);
  const olderHref = data.nextBefore ? `/audit?${new URLSearchParams({ ...Object.fromEntries(keep), before: data.nextBefore })}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Plain GET form: filters live in the URL, so they can be shared. */}
        <Form action="/audit" className="flex flex-wrap items-end gap-2">
          <div className="space-y-1 text-[11px] text-muted-foreground">Area
            <FormSelect key={`entity-${filters.entity ?? ""}`} name="entity" aria-label="Area" defaultValue={filters.entity} allLabel="All" options={data.options.entities.map((e) => ({ value: e, label: e }))} />
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">Person
            <FormSelect key={`actor-${filters.actor ?? ""}`} name="actor" aria-label="Person" defaultValue={filters.actor} allLabel="Anyone" options={data.options.actors.map((a) => ({ value: a.id, label: a.name }))} />
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">Action
            <FormSelect key={`action-${filters.action ?? ""}`} name="action" aria-label="Action" defaultValue={filters.action} allLabel="Any" options={data.options.actions.map((a) => ({ value: a, label: a }))} />
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">From
            <DatePicker key={`from-${filters.from ?? ""}`} name="from" aria-label="From" defaultValue={filters.from} placeholder="Any date" clearable className="w-40" />
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">To
            <DatePicker key={`to-${filters.to ?? ""}`} name="to" aria-label="To" defaultValue={filters.to} placeholder="Any date" clearable className="w-40" />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Apply</Button>
          {keep.toString() && <Button asChild size="sm" variant="ghost" className="h-8 text-xs"><Link href="/audit">Clear</Link></Button>}
        </Form>
        {isSuperAdmin(me.role) && <PruneAuditButton />}
      </div>

      {data.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No entries match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">What</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const lines = describe(r.changes);
                return (
                  <tr key={r.id} className="border-t border-border/40 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                      {new Date(r.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.actor ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar className="h-6 w-6" user={r.actor} textClassName="text-[9px]" />
                          <span className="whitespace-nowrap">{r.actor.name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">System</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="font-medium">{r.entity}</span> <span className="text-muted-foreground">· {r.action}</span>
                      {r.href && <Link href={r.href} prefetch={false} className="ml-2 text-xs underline underline-offset-2">Open</Link>}
                    </td>
                    <td className="max-w-xl px-4 py-2.5 text-xs text-muted-foreground">
                      {lines.length === 0 ? "—" : (
                        <details>
                          <summary className="cursor-pointer truncate">{lines[0]}{lines.length > 1 ? ` (+${lines.length - 1})` : ""}</summary>
                          <ul className="mt-1 space-y-0.5">{lines.map((l, i) => <li key={i} className="break-words">{l}</li>)}</ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {olderHref && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm"><Link href={olderHref} prefetch={false}>Load Older</Link></Button>
        </div>
      )}
    </div>
  );
}
