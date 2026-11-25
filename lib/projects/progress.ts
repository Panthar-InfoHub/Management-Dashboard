/** Project progress is always derived from its tasks: done ÷ total, 0 when empty. */
export function computeProgress(completedTasks: number, totalTasks: number): number {
  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}
