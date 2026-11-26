import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracksAttendance } from "@/lib/access";
import { UserError } from "@/lib/errors";
import { todayKey } from "@/lib/attendance/calendar";
import { extractPunchPoint, parsePunchAction, parsePunchTimestamp } from "@/lib/attendance/punch";
import { getOfficeFor } from "@/lib/attendance/queries";
import { findOpenSessionOnDate, recordClockIn, recordClockOut } from "@/lib/attendance/service";

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  const apiKey = request.headers.get("x-api-key")?.trim();
  return apiKey || null;
}

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function resolveEmployee(body: Record<string, unknown>) {
  const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : typeof body.id === "string" ? body.id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const kavachXCode = typeof body.kavachXCode === "string" ? body.kavachXCode.trim() : "";
  const pantharCode = typeof body.pantharCode === "string" ? body.pantharCode.trim() : "";

  const where = employeeId
    ? { id: employeeId }
    : email
      ? { email }
      : kavachXCode
        ? { kavachXCode }
        : pantharCode
          ? { pantharCode }
          : null;

  if (!where) return { error: NextResponse.json({ error: "Provide employeeId, email, kavachXCode, or pantharCode." }, { status: 400 }) };

  const employee = await db.employee.findUnique({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });
  if (!employee) return { error: NextResponse.json({ error: "Employee not found." }, { status: 404 }) };
  if (employee.status === "INACTIVE") return { error: NextResponse.json({ error: "Employee account is inactive." }, { status: 403 }) };
  if (!tracksAttendance(employee.role)) return { error: NextResponse.json({ error: "Super Admins don't clock in." }, { status: 422 }) };

  return { employee };
}

export async function POST(request: Request) {
  const expectedKey = process.env.ATTENDANCE_API_KEY?.trim();
  if (!expectedKey) {
    return NextResponse.json({ error: "Attendance API key is not configured." }, { status: 503 });
  }

  const providedKey = extractToken(request);
  if (!providedKey || !keysMatch(providedKey, expectedKey)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;

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
        reentryNote: null,
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
