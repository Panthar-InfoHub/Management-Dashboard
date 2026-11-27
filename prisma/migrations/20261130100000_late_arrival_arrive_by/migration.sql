-- Late Arrival "arrive by" time, and the office grace after it.
ALTER TABLE "Request" ADD COLUMN "arriveBy" TIMESTAMP(3);
ALTER TABLE "Office" ADD COLUMN "lateArrivalGraceMinutes" INTEGER NOT NULL DEFAULT 15;
