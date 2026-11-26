// Avatars: a real photo when someone uploaded one, otherwise their initials on
// a color that stays the same for that person, so people are easy to tell apart.
// Client-safe: no server imports.

/**
 * The photo to show, or null for generated placeholders (Clerk's default image,
 * Dicebear), which look the same for everyone.
 */
export function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("dicebear.com")) return null;
    if (u.hostname === "img.clerk.com") {
      const segment = u.pathname.split("/").filter(Boolean).pop() ?? "";
      const json = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/")));
      if (json?.type === "default") return null;
    }
  } catch {
    // Not a URL we can inspect: show it as is.
  }
  return url;
}

/** Up to two initials: first and last name, or the first two letters of one word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Literal class names so Tailwind keeps them. Red is left out: it means "error".
const COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200",
];

/** A color for this person (by id, or name), the same everywhere. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}
