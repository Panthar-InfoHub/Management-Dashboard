import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NewProjectForm } from "@/components/projects/new-project-form";

export default async function NewProjectPage() {
  await requireAuth("project:create");

  const [employees, teams] = await Promise.all([
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" }
    }),
    db.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return <NewProjectForm employees={employees} teams={teams} />;
}
