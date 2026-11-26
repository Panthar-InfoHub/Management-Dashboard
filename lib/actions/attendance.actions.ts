"use server";
import { UserError } from "@/lib/errors";

// Clock in / clock out. A day ends at midnight (office time): a clock-in with
// no clock-out by then becomes a missed checkout, without hours, fixed later
// by an attendance-fix request. Clock-out sets left-early or overtime against
// office hours.
import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/auth";
import { tracksAttendance } from "@/lib/access";
import type { GeoPoint } from "@/lib/attendance/rules";
import { recordClockIn, recordClockOut } from "@/lib/attendance/service";

function refresh() {
  revalidatePath("/");
  revalidatePath("/attendance");
  revalidatePath("/attendance/today");
}

async function requireTracked() {
  const employee = await getCurrentEmployee();
  if (!tracksAttendance(employee.role)) throw new UserError("Super Admins don't clock in.");
  return employee;
}

export async function clockInAction(input: { location?: GeoPoint | null }) {
  const employee = await requireTracked();
  const result = await recordClockIn({
    employeeId: employee.id,
    location: input.location,
  });
  if (result.success) refresh();
  return result;
}

export async function clockOutAction(input: { location?: GeoPoint | null }) {
  const employee = await requireTracked();
  try {
    const result = await recordClockOut({
      employeeId: employee.id,
      location: input.location,
    });
    refresh();
    return result;
  } catch (err) {
    if (err instanceof UserError) refresh();
    throw err;
  }
}
