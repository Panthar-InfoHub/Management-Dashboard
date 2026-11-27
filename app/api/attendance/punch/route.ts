import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { UserError } from "@/lib/errors";
import { checkApiKey, readJsonObject, resolveEmployee } from "@/lib/api/key-auth";
import { todayKey } from "@/lib/attendance/calendar";
import { extractPunchPoint, parsePunchAction, parsePunchTimestamp } from "@/lib/attendance/punch";
import { getOfficeFor } from "@/lib/attendance/queries";
import { findOpenSessionOnDate, recordClockIn, recordClockOut } from "@/lib/attendance/service";

export async function POST(request: Request) {
  const denied = checkApiKey(request);
  if (denied) return denied;

  const parsed = await readJsonObject(request);
  if ("error" in parsed) return parsed.error;
  const { body } = parsed;

  let at: Date;
  let requestedAction: ReturnType<typeof parsePunchAction>;
  try {
    at = parsePunchTimestamp(body.timestamp);
    requestedAction = parsePunchAction(body.action);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const resolved = await resolveEmployee(body);
  if ("error" in resolved) return resolved.error;
  const { employee } = resolved;

  const location = extractPunchPoint(body);

  let action: "CHECK_IN" | "CHECK_OUT";
  if (requestedAction === "AUTO") {
    const office = await getOfficeFor(employee.id);
    const dateKey = todayKey(office.timezone, at);
    const open = await findOpenSessionOnDate(employee.id, dateKey);
    action = open ? "CHECK_OUT" : "CHECK_IN";
  } else {
    action = requestedAction;
  }

  try {
    if (action === "CHECK_IN") {
      const result = await recordClockIn({
        employeeId: employee.id,
        at,
        location,
        ignoreAccuracy: true,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, action, blocked: result.blocked, error: result.message },
          { status: 422 },
        );
      }
      revalidatePath("/");
      revalidatePath("/attendance");
      revalidatePath("/attendance/today");
      return NextResponse.json({
        success: true,
        action,
        employeeId: employee.id,
        time: result.time,
        message: result.message,
      });
    }

    const result = await recordClockOut({
      employeeId: employee.id,
      at,
      location,
      ignoreAccuracy: true,
    });
    revalidatePath("/");
    revalidatePath("/attendance");
    revalidatePath("/attendance/today");
    return NextResponse.json({
      success: true,
      action,
      employeeId: employee.id,
      time: result.time,
      workMinutes: result.workMinutes,
      earlyMinutes: result.earlyMinutes,
      overtimeMinutes: result.overtimeMinutes,
      message: result.message,
    });
  } catch (err) {
    if (err instanceof UserError) {
      revalidatePath("/");
      revalidatePath("/attendance");
      revalidatePath("/attendance/today");
      return NextResponse.json({ success: false, action, error: err.message }, { status: 409 });
    }
    throw err;
  }
}
