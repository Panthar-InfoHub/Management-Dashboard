-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_status_order_idx" ON "Task"("status", "order");
