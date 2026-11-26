"use client";
import type { Prisma } from "@/lib/generated/prisma";
import type { Jsonify } from "@/lib/types";

type RecordRow = Jsonify<Prisma.EmploymentRecordGetPayload<{
  include: { employee: { select: { id: true; firstName: true; lastName: true; avatarUrl: true; email: true } } };
}>>;

const LEDGER_LABELS: Record<string, string> = {
  JOINED: "Joined", PROMOTION: "Promotion", TRANSFER: "Transfer", TITLE_CHANGE: "Title change", REHIRED: "Rehired", EXITED: "Left",
};

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Role colors removed as we don't display role anymore

const formatDate = (dateString: string | Date) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export function RecordsClient({ records }: { records: RecordRow[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = records.filter(r => 
    r.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.designation && r.designation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name or role..." 
            className="pl-9 bg-background border-border/40" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-border/40 rounded-lg overflow-x-auto bg-background shadow-sm">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead className="min-w-[200px] font-medium text-[11px] uppercase tracking-wider">Employee</TableHead>
              <TableHead className="min-w-[150px] font-medium text-[11px] uppercase tracking-wider">Title / Designation</TableHead>
              <TableHead className="min-w-[120px] font-medium text-[11px] uppercase tracking-wider">Duration</TableHead>
              <TableHead className="min-w-[150px] font-medium text-[11px] uppercase tracking-wider">Reason</TableHead>
              <TableHead className="min-w-[100px] font-medium text-[11px] uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="p-8 text-center text-sm text-muted-foreground">No records found.</div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(record => (
                <TableRow key={record.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Link href={`/employees/${record.employeeId}`} className="flex items-center gap-3 min-w-0 group cursor-pointer">
                      <UserAvatar className="h-9 w-9 border border-border/40 group-hover:border-primary/50 transition-colors" user={record.employee} textClassName="text-sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {record.employee.firstName} {record.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{record.employee.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {record.designation || "Employee"}
                      {record.type && <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{LEDGER_LABELS[record.type] ?? record.type}</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <span>{formatDate(record.startDate)}</span>
                      <span>to {record.endDate ? formatDate(record.endDate) : <span className="text-emerald-500 font-medium">Present</span>}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-foreground truncate max-w-[150px] block" title={record.reason ?? undefined}>
                      {record.reason || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.endDate ? (
                      <Badge variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground">Concluded</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-0">Active Phase</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
