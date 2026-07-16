"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTeamAction(data: {
  name: string;
  description?: string;
  color?: string;
  leadId: string;
}) {
  const employee = await requireAuth("admin:manage"); // Require high permissions

  const team = await db.team.create({
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      leadId: data.leadId,
      members: {
        connect: [{ id: data.leadId }] // Lead is automatically a member
      }
    }
  });

  revalidatePath("/teams");
  return team;
}
