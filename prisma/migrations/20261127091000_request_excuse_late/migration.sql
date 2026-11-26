-- Approver excused lateness on the request's days.
ALTER TABLE "Request" ADD COLUMN "excuseLate" BOOLEAN NOT NULL DEFAULT false;
