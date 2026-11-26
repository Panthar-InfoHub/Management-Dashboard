-- Employment ledger event types. Additive: new enum + three optional columns.
CREATE TYPE "EmploymentEvent" AS ENUM ('JOINED', 'PROMOTION', 'TRANSFER', 'TITLE_CHANGE', 'REHIRED', 'EXITED');

ALTER TABLE "EmploymentRecord" ADD COLUMN "type" "EmploymentEvent";
ALTER TABLE "EmploymentRecord" ADD COLUMN "teamId" TEXT;
ALTER TABLE "EmploymentRecord" ADD COLUMN "changedById" TEXT;

-- Fill in what the old free-text reasons make certain; anything else stays NULL.
UPDATE "EmploymentRecord" SET "type" = 'JOINED'  WHERE "type" IS NULL AND "reason" = 'Initial Hire';
UPDATE "EmploymentRecord" SET "type" = 'REHIRED' WHERE "type" IS NULL AND "reason" = 'Rehired';
