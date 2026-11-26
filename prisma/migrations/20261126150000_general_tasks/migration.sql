-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TaskSequence" (
    "key" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskSequence_pkey" PRIMARY KEY ("key")
);

INSERT INTO "TaskSequence" ("key", "last") VALUES ('GEN', 0) ON CONFLICT DO NOTHING;
