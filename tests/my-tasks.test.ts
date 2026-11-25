import { test } from "node:test";
import assert from "node:assert/strict";
import { dueBucket } from "../lib/tasks/my-tasks";

test("groups due dates for My Tasks", () => {
  const today = "2026-11-26";
  assert.equal(dueBucket(null, today), "none");
  assert.equal(dueBucket("2026-11-25", today), "overdue");
  assert.equal(dueBucket("2026-11-26", today), "today");
  assert.equal(dueBucket("2026-11-27", today), "week");
  assert.equal(dueBucket("2026-12-03", today), "week");
  assert.equal(dueBucket("2026-12-04", today), "later");
});
