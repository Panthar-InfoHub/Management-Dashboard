-- Office hours, plus left-early and overtime on each attendance day.
-- Additive only; defaults keep existing rows valid.
ALTER TABLE "Office" ADD COLUMN "workStart" TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE "Office" ADD COLUMN "workEnd" TEXT NOT NULL DEFAULT '19:00';

ALTER TABLE "Attendance" ADD COLUMN "leftEarly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendance" ADD COLUMN "earlyMinutes" INTEGER;
ALTER TABLE "Attendance" ADD COLUMN "overtimeMinutes" INTEGER;
