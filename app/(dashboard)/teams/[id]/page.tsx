import { getTeamById } from "@/lib/queries/team.queries";
import { notFound } from "next/navigation";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeamById(id);

  if (!team) {
    notFound();
  }

  return <TeamDetailClient initialTeam={JSON.parse(JSON.stringify(team))} />;
}
