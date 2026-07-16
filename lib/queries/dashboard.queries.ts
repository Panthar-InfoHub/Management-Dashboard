import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function getDashboardActionableMetrics() {
  const employee = await getCurrentEmployee();

  // Find top priority active projects
  const attentionProjects = await db.project.findMany({
    where: {
      status: "ACTIVE",
      health: { in: ["AT_RISK", "CRITICAL"] },
      members: { some: { employeeId: employee.id } }
    },
    take: 2
  });

  // Find priority tasks assigned to the employee
  const priorityTasks = await db.task.findMany({
    where: {
      status: { notIn: ["DONE", "TESTING"] },
      assignees: { some: { id: employee.id } },
      priority: { in: ["HIGH", "CRITICAL"] }
    },
    include: { project: { select: { name: true } } },
    take: 4
  });

  // Pending reviews
  const pendingReviewsCount = await db.task.count({
    where: {
      status: "REVIEW",
      project: { members: { some: { employeeId: employee.id } } }
    }
  });

  // Team pulse stats
  const totalEmployees = await db.employee.count({
    where: { status: "ACTIVE" }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysUpdatesCount = await db.dailyUpdate.count({
    where: {
      date: { gte: today }
    }
  });

  return {
    attentionProjects,
    priorityTasks,
    pendingReviews: pendingReviewsCount,
    teamPulse: {
      totalEmployees,
      onlineCount: Math.ceil(totalEmployees * 0.7), // Fake online presence for now
      todaysUpdates: todaysUpdatesCount
    }
  };
}

export async function getDashboardProjectsSummary() {
  const employee = await getCurrentEmployee();

  const projectWhereClause: Prisma.ProjectWhereInput = employee.role === "ADMIN" ? {
    status: { in: ["ACTIVE", "PLANNING"] }
  } : {
    members: { some: { employeeId: employee.id } },
    status: { in: ["ACTIVE", "PLANNING"] }
  };

  // Fetch top 4 active projects ordered by priority
  const projects = await db.project.findMany({
    where: projectWhereClause,
    include: {
      team: true,
      tasks: {
        select: { status: true }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 4
  });

  // Calculate progress on the fly based on tasks
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

export async function getDashboardActivityFeed() {
  const employee = await getCurrentEmployee();

  // Fetch recent audit logs for projects/tasks the employee is involved in
  return db.auditLog.findMany({
    where: {
      OR: [
        { actorId: employee.id },
        // Ideally we filter by entityIds the user has access to, but for v1 we fetch global recent activity
      ]
    },
    include: {
      actor: true
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });
}
