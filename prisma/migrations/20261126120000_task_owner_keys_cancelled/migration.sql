-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "key" TEXT,
ADD COLUMN     "taskCounter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "ownerId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'TODO';

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_number_key" ON "Task"("projectId", "number");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Data ────────────────────────────────────────────────────────────────
-- Backlog is gone: those tasks are To Do.
UPDATE "Task" SET "status" = 'TODO' WHERE "status" = 'BACKLOG';

-- Owner: the first current assignee by name (everyone stays an assignee).
UPDATE "Task" t SET "ownerId" = x."employeeId"
FROM (
  SELECT DISTINCT ON (a."B") a."B" AS "taskId", e."id" AS "employeeId"
  FROM "_TaskAssignees" a JOIN "Employee" e ON e."id" = a."A"
  ORDER BY a."B", e."firstName", e."lastName", e."id"
) x
WHERE t."id" = x."taskId";

-- Task numbers per project, oldest first.
UPDATE "Task" t SET "number" = n.rn
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") AS rn FROM "Task") n
WHERE t."id" = n."id";
UPDATE "Project" p SET "taskCounter" = COALESCE((SELECT MAX("number") FROM "Task" t WHERE t."projectId" = p."id"), 0);

-- Project keys from the name (same rule as lib/tasks/keys.ts):
-- several words → initials (short all-caps words kept whole, e.g. "JP Interio" → JPI);
-- one word → its capitals ("KavachX" → KX) or its first 3 letters. Max 5, deduped.
WITH words AS (
  SELECT p."id", w.word, w.ord
  FROM "Project" p,
       regexp_split_to_table(regexp_replace(p."name", '[^A-Za-z0-9 ]', ' ', 'g'), '\s+') WITH ORDINALITY AS w(word, ord)
  WHERE w.word <> '' AND lower(w.word) NOT IN ('and', 'of', 'the', 'for', 'a', 'an', 'project')
),
base AS (
  SELECT p."id", p."createdAt",
    COALESCE(NULLIF(LEFT(UPPER(
      CASE
        WHEN (SELECT COUNT(*) FROM words w WHERE w."id" = p."id") > 1 THEN
          (SELECT string_agg(CASE WHEN w.word ~ '^[A-Z0-9]{2,3}$' THEN w.word ELSE LEFT(w.word, 1) END, '' ORDER BY w.ord) FROM words w WHERE w."id" = p."id")
        ELSE
          (SELECT CASE WHEN length(regexp_replace(w.word, '[^A-Z]', '', 'g')) >= 2 THEN regexp_replace(w.word, '[^A-Z]', '', 'g') ELSE LEFT(w.word, 3) END FROM words w WHERE w."id" = p."id" LIMIT 1)
      END), 5), ''), 'PRJ') AS k
  FROM "Project" p
),
ranked AS (SELECT "id", k, ROW_NUMBER() OVER (PARTITION BY k ORDER BY "createdAt", "id") AS rn FROM base)
UPDATE "Project" p SET "key" = CASE WHEN r.rn = 1 THEN r.k ELSE r.k || r.rn END
FROM ranked r WHERE p."id" = r."id";
