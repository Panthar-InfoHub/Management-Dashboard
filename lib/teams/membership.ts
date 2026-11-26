// Team membership: a person is in no team or several, all equal (TeamMembership).
// Employee.teamId is legacy and unused. Use these helpers wherever team matters.
import { db } from "@/lib/db";

/** Prisma filter: the employee belongs to any of these teams. */
export function inAnyTeam(teamIds: string[]) {
  return { teamMemberships: { some: { teamId: { in: teamIds } } } };
}

/** Every team the employee belongs to. */
export async function teamIdsOf(employeeId: string): Promise<string[]> {
  const rows = await db.teamMembership.findMany({ where: { employeeId }, select: { teamId: true } });
  return rows.map((r) => r.teamId);
}

/** Leads of every team the employee belongs to (excluding themselves). */
export async function leadsOf(employeeId: string): Promise<string[]> {
  const rows = await db.teamMembership.findMany({ where: { employeeId }, select: { team: { select: { leadId: true } } } });
  return [...new Set(rows.map((r) => r.team.leadId))].filter((id) => id !== employeeId);
}

/** Add/remove an employee's teams in one go (pass a transaction client to stay atomic). */
export async function setTeams(
  tx: Pick<typeof db, "teamMembership">,
  employeeId: string,
  join: string[],
  leave: string[]
) {
  if (leave.length) await tx.teamMembership.deleteMany({ where: { employeeId, teamId: { in: leave } } });
  if (join.length) await tx.teamMembership.createMany({ data: join.map((teamId) => ({ teamId, employeeId })), skipDuplicates: true });
}
