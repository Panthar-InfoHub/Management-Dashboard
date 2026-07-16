import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getProjectsList() {
  const employee = await getCurrentEmployee();

  // Fetch all projects where the employee is a member, lead, or team member (Admins see all)
  const whereClause = employee.role === "ADMIN" ? {} : {
    OR: [
      { members: { some: { employeeId: employee.id } } },
      { leadId: employee.id },
      { team: { members: { some: { id: employee.id } } } }
    ]
  };

  const projects = await db.project.findMany({
    where: whereClause,
    include: {
      team: { select: { name: true } },
      lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      members: { 
        include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } 
      },
      tasks: { select: { id: true, status: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  // Calculate computed progress based on tasks
  return projects.map((p: any) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t: any) => t.status === "DONE").length;
    const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;

    return {
      ...p,
      computedProgress
    };
  });
}

export async function getProjectById(projectId: string) {
  const employee = await getCurrentEmployee();

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      team: true,
      lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      members: { 
        include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } } 
      },
      tasks: {
        include: {
          assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!project) return null;

  // Verify access
  if (employee.role !== "ADMIN" && project.leadId !== employee.id) {
    const isMember = project.members.some(m => m.employeeId === employee.id);
    if (!isMember) {
      // Wait, let's also check if they are in the owning team
      const team = await db.team.findUnique({
        where: { id: project.teamId },
        include: { members: { select: { id: true } } }
      });
      const inTeam = team?.members.some(m => m.id === employee.id);
      
      if (!inTeam) {
        throw new Error("Unauthorized access to project");
      }
    }
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t: any) => t.status === "DONE").length;
  const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress;

  return {
    ...project,
    computedProgress
  };
}
