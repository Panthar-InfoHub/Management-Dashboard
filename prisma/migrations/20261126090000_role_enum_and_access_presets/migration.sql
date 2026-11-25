-- Roles become an access level only: SUPER_ADMIN, ADMIN, MEMBER.
-- Converted in place (never drop the column): ADMIN stays ADMIN, every other
-- old value (MANAGER, EMPLOYEE, INTERN, custom) becomes MEMBER. Interns keep
-- that fact as employmentType = INTERN. Super admins are set afterwards by
-- scripts/assign-access.mjs.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'INTERN', 'CONTRACT');

-- Employment type, filled from the old INTERN role before the role changes.
ALTER TABLE "Employee" ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME';
UPDATE "Employee" SET "employmentType" = 'INTERN' WHERE "role" = 'INTERN';

-- Convert role text -> enum in place (the existing Employee_role_idx is rebuilt by Postgres).
ALTER TABLE "Employee" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "role" TYPE "Role"
  USING (CASE WHEN "role" IN ('SUPER_ADMIN', 'ADMIN') THEN "role" ELSE 'MEMBER' END)::"Role";
ALTER TABLE "Employee" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "AccessPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAccessPreset" (
    "employeeId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAccessPreset_pkey" PRIMARY KEY ("employeeId","presetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessPreset_name_key" ON "AccessPreset"("name");

-- CreateIndex
CREATE INDEX "EmployeeAccessPreset_presetId_idx" ON "EmployeeAccessPreset"("presetId");

-- AddForeignKey
ALTER TABLE "EmployeeAccessPreset" ADD CONSTRAINT "EmployeeAccessPreset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAccessPreset" ADD CONSTRAINT "EmployeeAccessPreset_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "AccessPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
