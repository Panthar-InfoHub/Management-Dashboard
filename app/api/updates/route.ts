// POST /api/updates: create or overwrite a person's daily update from another
// system. Uses the same key as the attendance punch API (ATTENDANCE_API_KEY,
// as "Authorization: Bearer <key>" or "x-api-key: <key>").
//
// Body (JSON):
//   email | employeeId | kavachXCode | pantharCode   who it's for (one of)
//   message   string, required: the update text (up to 4000 characters)
//   date      "YYYY-MM-DD", optional: the day (default: today, office time)
//   taskIds   string[], optional: tasks to link (must be assigned to them);
//             replaces the current links. Leave it out to keep them.
//
// Same rules as the app: only for a day they worked (clocked in, not Absent).
// Sending again for the same person and day overwrites the update.
//   201 created · 200 overwritten · 400 bad input · 401 bad key
//   404 unknown person · 422 not allowed (e.g. no attendance that day)
import { NextResponse } from "next/server";
import { UserError } from "@/lib/errors";
import { checkApiKey, readJsonObject, resolveEmployee } from "@/lib/api/key-auth";
import { UPDATE_MAX_LENGTH, UPDATE_MAX_TASKS, todayFor } from "@/lib/updates/queries";
import { saveDailyUpdate } from "@/lib/updates/save";

export async function POST(request: Request) {
  const denied = checkApiKey(request);
  if (denied) return denied;

  const parsed = await readJsonObject(request);
  if ("error" in parsed) return parsed.error;
  const { body } = parsed;

  if (body.date !== undefined && body.date !== null && (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD, e.g. 2026-11-26." }, { status: 400 });
  }
  if (typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "message is required: the update text." }, { status: 400 });
  }
  if (body.message.trim().length > UPDATE_MAX_LENGTH) {
    return NextResponse.json({ error: `message must be at most ${UPDATE_MAX_LENGTH} characters.` }, { status: 400 });
  }
  if (body.taskIds !== undefined && body.taskIds !== null && (!Array.isArray(body.taskIds) || body.taskIds.some((id) => typeof id !== "string") || body.taskIds.length > UPDATE_MAX_TASKS)) {
    return NextResponse.json({ error: `taskIds must be a list of at most ${UPDATE_MAX_TASKS} task IDs.` }, { status: 400 });
  }

  const resolved = await resolveEmployee(body, "Super Admins don't add daily updates.");
  if ("error" in resolved) return resolved.error;
  const { employee } = resolved;
  const dateKey = typeof body.date === "string" ? body.date : await todayFor(employee.id);

  try {
    const saved = await saveDailyUpdate({ employee, dateKey, body: body.message, taskIds: body.taskIds, source: "api" });
    return NextResponse.json(
      { success: true, created: saved.created, updateId: saved.id, employeeId: employee.id, date: dateKey, taskIds: saved.taskIds, updatedAt: saved.updatedAt.toISOString() },
      { status: saved.created ? 201 : 200 },
    );
  } catch (err) {
    // Input is checked above, so what's left is a rule: no attendance that day, task not theirs…
    if (err instanceof UserError) return NextResponse.json({ success: false, error: err.message }, { status: 422 });
    throw err;
  }
}
