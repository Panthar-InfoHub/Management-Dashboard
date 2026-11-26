-- Overtime is now time worked beyond a full day (office end − office start),
-- not time outside office hours. Recompute it for days already recorded, and
-- clear "left early" on days that still put in a full day.
WITH hours AS (
  SELECT
    a."id",
    a."workMinutes",
    (split_part(o."workEnd", ':', 1)::int * 60 + split_part(o."workEnd", ':', 2)::int)
      - (split_part(o."workStart", ':', 1)::int * 60 + split_part(o."workStart", ':', 2)::int) AS full_day
  FROM "Attendance" a
  JOIN "Office" o ON o."id" = a."officeId"
  WHERE a."dayKind" IN ('OFFICE', 'WFH') AND a."workMinutes" IS NOT NULL
)
UPDATE "Attendance" a
SET
  "overtimeMinutes" = NULLIF(GREATEST(0, h."workMinutes" - h.full_day), 0),
  "leftEarly"    = CASE WHEN h."workMinutes" >= h.full_day THEN false ELSE a."leftEarly" END,
  "earlyMinutes" = CASE WHEN h."workMinutes" >= h.full_day THEN NULL ELSE a."earlyMinutes" END
FROM hours h
WHERE a."id" = h."id";
