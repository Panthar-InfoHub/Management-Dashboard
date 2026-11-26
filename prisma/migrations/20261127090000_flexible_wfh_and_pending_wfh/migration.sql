-- Flexible WFH: chosen people work from home without a request.
ALTER TABLE "Employee" ADD COLUMN "flexibleWfh" BOOLEAN NOT NULL DEFAULT false;

-- Clock-in under a pending WFH request, and late arrivals an approver excused.
ALTER TABLE "Attendance" ADD COLUMN "awaitingWfh" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendance" ADD COLUMN "lateExcused" BOOLEAN NOT NULL DEFAULT false;
