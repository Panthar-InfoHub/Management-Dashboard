-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_updatedAt_idx" ON "Task"("updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_dueDate_idx" ON "Task"("status", "dueDate");
