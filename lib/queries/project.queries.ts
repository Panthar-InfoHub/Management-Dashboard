import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export async function getProjectsList() {
  const employee = await getCurrentEmployee();

  const canViewAll = await checkPermission("project:update");
  
  // Fetch all projects where the employee is explicitly a member or the project lead (Admins/Managers see all)
  const whereClause = canViewAll ? {} : {
    OR: [
      { members: { some: { employeeId: employee.id } } },
      { leadId: employee.id }
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
  if (employee.role !== "ADMIN" && employee.role !== "MANAGER" && project.leadId !== employee.id) {
    const isMember = project.members.some(m => m.employeeId === employee.id);
    if (!isMember) {
      throw new Error("FORBIDDEN: Requires higher permission level");
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
