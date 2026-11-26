import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tracksAttendance } from "@/lib/access";

// Shared by the API-key routes (/api/attendance/punch, /api/updates): the key
// check, reading a JSON body, and finding the employee the call is about.
// These routes are public in proxy.ts; this key is their only gate.

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

/** Null when the ATTENDANCE_API_KEY matches; otherwise the error response. */
export function checkApiKey(request: Request): NextResponse | null {
  const expectedKey = process.env.ATTENDANCE_API_KEY?.trim();
  if (!expectedKey) return NextResponse.json({ error: "Attendance API key is not configured." }, { status: 503 });
  const providedKey = extractToken(request);
  if (!providedKey || !keysMatch(providedKey, expectedKey)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return null;
}

/** The JSON object body, or an error response. */
export async function readJsonObject(request: Request): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 }) };
  }
  return { body: raw as Record<string, unknown> };
}

/**
 * The tracked employee named by employeeId (or id), email, kavachXCode or
 * pantharCode, in that order. Inactive people and Super Admins are refused.
 */
export async function resolveEmployee(body: Record<string, unknown>, superAdminMessage = "Super Admins don't clock in.") {
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
  if (!tracksAttendance(employee.role)) return { error: NextResponse.json({ error: superAdminMessage }, { status: 422 }) };

  return { employee };
}
