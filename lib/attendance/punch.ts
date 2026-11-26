import type { GeoPoint } from "@/lib/attendance/rules";

export type PunchAction = "CHECK_IN" | "CHECK_OUT" | "AUTO";

/** Parse an optional timestamp (ISO string or Unix ms/s) into a valid Date, defaulting to now. */
export function parsePunchTimestamp(value: unknown, now: Date = new Date()): Date {
  if (value === undefined || value === null || value === "") return now;
  let parsed: Date;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Treat 10-digit numbers as Unix seconds, 13-digit numbers as milliseconds.
    parsed = new Date(Math.abs(value) < 1e12 ? value * 1000 : value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return now;
    parsed = new Date(trimmed);
  } else {
    throw new Error("Invalid timestamp. Provide an ISO-8601 date string.");
  }
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid timestamp. Provide an ISO-8601 date string.");
  }
  return parsed;
}

/** Normalize the action field ("CHECK_IN", "CHECK_OUT", or "AUTO"). */
export function parsePunchAction(value: unknown): PunchAction {
  if (value === undefined || value === null || value === "") return "AUTO";
  if (typeof value !== "string") throw new Error('Invalid action. Use "CHECK_IN", "CHECK_OUT", or "AUTO".');
  switch (value.trim().toUpperCase()) {
    case "CHECK_IN":
    case "CHECK-IN":
    case "IN":
      return "CHECK_IN";
    case "CHECK_OUT":
    case "CHECK-OUT":
    case "OUT":
      return "CHECK_OUT";
    case "AUTO":
      return "AUTO";
    default:
      throw new Error('Invalid action. Use "CHECK_IN", "CHECK_OUT", or "AUTO".');
  }
}

/**
 * Extract lat/lng from either `body.location` or top-level `body.lat`/`body.lng`.
 * Accuracy is intentionally omitted so geofencing checks strictly on lat and lng.
 */
export function extractPunchPoint(body: Record<string, unknown>): GeoPoint | null {
  const loc = body.location && typeof body.location === "object" && !Array.isArray(body.location)
    ? (body.location as Record<string, unknown>)
    : null;
  const rawLat = loc ? loc.lat : body.lat;
  const rawLng = loc ? loc.lng : body.lng;
  if (rawLat == null || rawLng == null || rawLat === "" || rawLng === "") return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, accuracy: null };
}
