import { db } from "../lib/db";

async function main() {
  const statuses = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"] as const;

  console.log("Normalizing existing task orders in database...");

  for (const status of statuses) {
    const tasks = await db.task.findMany({
      where: { status },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, order: true }
    });

    console.log(`Status ${status}: ${tasks.length} tasks`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const newOrder = (i + 1) * 1000;
      await db.task.update({
        where: { id: task.id },
        data: { order: newOrder }
      });
    }
  }

  console.log("Task order normalization complete!");
}

main().catch(console.error);
