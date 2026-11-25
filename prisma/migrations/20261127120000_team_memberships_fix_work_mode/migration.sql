-- People can belong to several teams (TeamMembership); Employee.teamId stays the home team.
-- Attendance fixes record where the person worked (Request.workMode). Additive only.

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "workMode" "DayKind";

-- CreateTable
CREATE TABLE "TeamMembership" (
    "teamId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("teamId","employeeId")
);

-- CreateIndex
CREATE INDEX "TeamMembership_employeeId_idx" ON "TeamMembership"("employeeId");

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Everyone's current team, and every team's lead, become memberships.
INSERT INTO "TeamMembership" ("teamId", "employeeId")
SELECT "teamId", "id" FROM "Employee" WHERE "teamId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "TeamMembership" ("teamId", "employeeId")
SELECT "id", "leadId" FROM "Team"
ON CONFLICT DO NOTHING;
