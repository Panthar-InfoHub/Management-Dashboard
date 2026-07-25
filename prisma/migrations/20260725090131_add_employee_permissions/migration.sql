-- CreateTable
CREATE TABLE "EmployeePermission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "projectId" TEXT,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EmployeePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeePermission_employeeId_idx" ON "EmployeePermission"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePermission_projectId_idx" ON "EmployeePermission"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePermission_employeeId_permission_projectId_key" ON "EmployeePermission"("employeeId", "permission", "projectId");

-- AddForeignKey
ALTER TABLE "EmployeePermission" ADD CONSTRAINT "EmployeePermission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePermission" ADD CONSTRAINT "EmployeePermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
