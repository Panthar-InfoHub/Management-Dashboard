// Seeds daily updates for testing: for each day someone clocked in (not
// Absent), writes an update linking 1–3 of their assigned tasks. About one in
// eight worked days is left without an update so "Missing" shows too. Existing
// updates are never changed. Deterministic: running it twice adds nothing new.
//
//   SEED_DAILY_UPDATES=yes npx tsx --tsconfig tsconfig.json scripts/seed-daily-updates.ts
//
// Writes to the database in .env.local. Never run it against production.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });

async function main() {
  const host = (process.env.DATABASE_URL ?? "").replace(/^.*@([^/:]+).*$/, "$1");
  console.log(`Database: ${host || "(DATABASE_URL not set)"}`);
  if (process.env.SEED_DAILY_UPDATES !== "yes" || process.env.NODE_ENV === "production") {
    console.log("Refusing to seed. Set SEED_DAILY_UPDATES=yes, and only for a test database.");
    process.exit(1);
  }
  const { db } = await import("../lib/db");

  // Small deterministic random, seeded per person and day.
  const rand = (seed: string) => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  };
  const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];

  const progress = [
    "Finished the main changes and opened it for review.",
    "Got most of it working; the last part is the error handling.",
    "Fixed the issues found in testing and pushed the update.",
    "Wrote tests for it and cleaned up the code.",
    "Picked it up today and worked out the approach.",
    "Addressed the review comments.",
    "Tested it on staging and it looks good.",
    "Still in progress, blocked for a while on unclear requirements; sorted it out with the team.",
  ];
  const extras = [
    "Reviewed two pull requests.",
    "Joined the planning call for next week.",
    "Helped a teammate debug a failing build.",
    "Updated the documentation for the changes.",
    "Looked into a bug reported by the client and noted the steps to reproduce it.",
    "Team sync in the morning.",
  ];

  const worked = await db.attendance.findMany({
    where: { checkInAt: { not: null }, status: { not: "ABSENT" }, employee: { status: "ACTIVE", role: { not: "SUPER_ADMIN" } } },
    select: { employeeId: true, date: true },
    orderBy: { date: "asc" },
  });
  const existing = new Set(
    (await db.dailyUpdate.findMany({ select: { employeeId: true, date: true } })).map((u) => `${u.employeeId}|${u.date.toISOString().slice(0, 10)}`),
  );
  const tasksByPerson = new Map<string, { id: string; title: string }[]>();
  for (const id of new Set(worked.map((w) => w.employeeId))) {
    tasksByPerson.set(id, await db.task.findMany({ where: { assignees: { some: { id } } }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }));
  }

  let created = 0, skipped = 0, leftMissing = 0;
  for (const w of worked) {
    const dateKey = w.date.toISOString().slice(0, 10);
    if (existing.has(`${w.employeeId}|${dateKey}`)) { skipped++; continue; }
    const r = rand(`${w.employeeId}|${dateKey}`);
    if (r() < 0.12) { leftMissing++; continue; }

    const own = tasksByPerson.get(w.employeeId) ?? [];
    const count = own.length ? 1 + Math.floor(r() * Math.min(3, own.length)) : 0;
    const linked = [...own].sort(() => r() - 0.5).slice(0, count);
    const lines = linked.map((t) => `Worked on "${t.title}". ${pick(r, progress)}`);
    if (lines.length === 0 || r() < 0.5) lines.push(pick(r, extras));

    // Saved in the evening (IST) of that day.
    const savedAt = new Date(w.date.getTime() + (12 * 60 + 30 + Math.floor(r() * 150)) * 60_000);
    await db.dailyUpdate.create({
      data: {
        employeeId: w.employeeId,
        date: w.date,
        body: lines.join("\n"),
        createdAt: savedAt,
        updatedAt: savedAt,
        tasks: { connect: linked.map((t) => ({ id: t.id })) },
      },
    });
    created++;
  }

  console.log(`Created ${created} updates. Left ${leftMissing} worked days without one. Kept ${skipped} that already existed.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
