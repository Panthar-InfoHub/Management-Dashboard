// Task IDs: "<project key>-<number>", e.g. JNV-24. Client-safe.

const SKIP = new Set(["and", "of", "the", "for", "a", "an", "project"]);

/** A key suggested from a project name (same rule as the backfill migration). */
export function suggestProjectKey(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !SKIP.has(w.toLowerCase()));
  let key: string;
  if (words.length > 1) key = words.map((w) => (/^[A-Z0-9]{2,3}$/.test(w) ? w : w[0])).join("");
  else if (words.length === 1) {
    const caps = words[0].replace(/[^A-Z]/g, "");
    key = caps.length >= 2 ? caps : words[0].slice(0, 3);
  } else key = "";
  return key.toUpperCase().slice(0, 5) || "PRJ";
}

/** Normalise what someone typed; null if it isn't a valid key. */
export function normaliseProjectKey(value: string): string | null {
  const key = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{1,5}$/.test(key) ? key : null;
}

/** Key for tasks that aren't in a project. */
export const GENERAL_TASK_KEY = "GEN";

export function taskKey(task: { number?: number | null; projectId?: string | null; project?: { key?: string | null } | null }): string | null {
  if (!task.number) return null;
  if (task.project?.key) return `${task.project.key}-${task.number}`;
  return task.project === null || task.projectId === null ? `${GENERAL_TASK_KEY}-${task.number}` : null;
}

/** "JNV-24" (any case) → { key, number }, else null. */
export function parseTaskKey(value: string): { key: string; number: number } | null {
  const m = value.trim().toUpperCase().match(/^([A-Z][A-Z0-9]{1,5})-(\d{1,7})$/);
  return m ? { key: m[1], number: Number(m[2]) } : null;
}

export const DONE_NOTE_MIN = 10;
