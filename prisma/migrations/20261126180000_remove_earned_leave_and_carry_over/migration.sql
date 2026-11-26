-- No carry-over: every leave year starts fresh.
ALTER TABLE "LeaveType" DROP COLUMN "carryOverMax";
ALTER TABLE "LeaveBalance" DROP COLUMN "carriedOver";

-- Earned Leave is not offered. Delete it (its balances cascade) when no request
-- uses it; otherwise only switch it off so past requests keep their type.
DELETE FROM "LeaveType" t
WHERE (t."id" = 'leave_earned' OR t."name" = 'Earned Leave')
  AND NOT EXISTS (SELECT 1 FROM "Request" r WHERE r."leaveTypeId" = t."id");

UPDATE "LeaveType" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'leave_earned' OR "name" = 'Earned Leave';
