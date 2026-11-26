-- Optional "short day" rule: fewer worked minutes than this on an office day
-- counts as a half day. NULL (the default) keeps the rule off.
ALTER TABLE "Office" ADD COLUMN "minFullDayMinutes" INTEGER;
