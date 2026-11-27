# Attendance Rules

For admins and HR. Employees see a short version on the **Attendance Rules** page (`/rules`).

How a day's attendance is decided, and how it can be corrected. The code
follows this document: `lib/attendance/rules.ts` (pure rules),
`lib/attendance/service.ts` (clock-in/out), `lib/attendance/fix.ts` and
`lib/actions/request.actions.ts` (time corrections, late arrivals),
`lib/actions/attendance-admin.actions.ts` (admin edits).

## Principles

1. **Times are facts, status is a decision.** Clock-in and clock-out record
   what happened. The status (Present, Late, Half Day…) is worked out from the
   office rules, and a person with approval rights can decide it differently.
2. **The rules suggest; an approver decides.** Once an approver has decided a
   day, nothing recalculates it automatically. A later clock-out only adds
   hours.
3. **Every change is on record.** Each clock-in, clock-out, fix, review and
   edit is an attendance event with who did it and why, plus an audit log entry.
4. **Nobody decides their own day.**

## Office settings (Settings → Office)

| Setting | Current (Jhansi) | Meaning |
|---|---|---|
| Office hours | 10:00 AM – 7:00 PM | A full day; used for "left early" and overtime |
| Late after | 11:00 AM | A clock-in after this is a late arrival |
| Late outcome | Half Day | What a late arrival on an office day becomes: Half Day or Late |
| Minimum hours | Off | If set, fewer worked hours on an office day makes it a Half Day |
| Grace | 15 minutes | Added to Late After (late from 11:16) and to an approved Late Arrival's "arrive by" time. Not shown to employees |

## What the rules give

| Day | Clock-in | Status |
|---|---|---|
| Office day | At or before 11:00 (+ grace) | Present |
| Office day | After 11:00 (+ grace) | **Half Day** (or Late, if the office is set to Late). Nothing goes to Approvals by itself |
| WFH day | Any time | WFH; flagged Late after 11:00, never cut to a half day |
| Day off / holiday | Any time | Present (worked on a day off); all hours are overtime |
| Half-day leave | Any time | Half Day, no review |
| No clock-in, past office day | — | Absent |
| Clock-in, no clock-out by midnight | — | Missed checkout; send a time correction |
| Clocked out already | Clock in again | Not allowed: one clock-in and one clock-out per day. Clocked out by mistake? Send a time correction |

## Which request to send

| What happened | Request | Times change? | Who picks the status |
|---|---|---|---|
| On time, clocked in and out | None | — | The rules (Present) |
| Late, the time is right, there's a reason | **Late Arrival** | No | Approver: Present or Late |
| Forgot to clock in/out, or the time is wrong | **Time Correction** | Yes | Approver: Present, Late or Half Day |
| Not working that day | Leave | — | — |

One request, one approval. A time correction with a late time doesn't need a
Late Arrival as well: the approver decides the status in the same step.

## Late Arrival (the person asks)

For "I was late" or "I will be late", when the clock-in time is right.

- **When:** any working day from 31 days before to 31 days after today. Ask in
  advance ("doctor tomorrow, I'll come at 12") or after the day.
- **Refused when:** the day isn't a working day, it's approved full-day leave,
  they clocked in on time that day, or a past day has no clock-in (send a
  time correction instead).
- **The approver picks:** **Present** (a normal full day; kept on record as an
  excused late arrival) or **Late** (full day, still in late counts). WFH days
  stay WFH.
- **"I'll arrive by":** required when asking before clocking in (a later day,
  or today before clock-in). It must be after the 11:00 cut-off and before
  office end. Not asked once they've clocked in: the approver sees the real time.
- **On approval:** a day already clocked in changes at once. A day not clocked
  in yet changes when they clock in, **if** they clock in by "arrive by" + the
  grace (12:00 + 15 min = up to 12:15). Later than that, the normal late rule
  applies (Half Day) and they can send a new Late Arrival for that day. The
  clock-in time is never touched.
- **Approver warning:** if they already clocked in later than they said, the
  request shows it before approving.
- **Rejected:** the day stays a Half Day.
- **Undo:** possible until they've clocked in that day; after that, use an
  admin edit.

Half days from before this change may still wait under "Half day review
(older)" in Approvals: Keep Half Day, or Make Full Day (shows as Present).

## Time Correction (the person asks; "Correct My Time")

For a forgotten clock-in or clock-out, or a wrong time.

**The person enters:**

- The **date**: today or up to 31 days back; not a day of approved full-day leave.
- **Where they worked**: office or from home.
- **Clock-in**: always.
- **Clock-out**: required for a past day; **optional for today** ("still
  working"). Times can't be later than now.
- A **reason**.

The form starts from the recorded times, so they only change the wrong one. A
fix that changes nothing is refused. A clock-in after 11:00 shows a warning
while they fill it in.

**The approver sees** recorded → requested times, and what the rules make of
them ("Clock-in 11:03 AM is after the 11:00 AM cut-off, so the rules make it
Half Day"), then picks what the day counts as:

| Day | Choices |
|---|---|
| Office day | Present · Late · Half Day |
| WFH day | WFH · WFH, Late · Half Day |
| Day off / holiday | Present |

The choice starts on the rules' suggestion. A late arrival that isn't marked
Late or Half Day is kept on record as excused.

**On approval:**

| Situation | Result |
|---|---|
| Both times given | Times replaced, hours worked out, status as chosen |
| Today, no clock-out, still clocked in | Clock-in replaced; they clock out as usual; status as chosen |
| Today, no clock-out, never clocked in | Clock-in created; they clock out as usual |
| No clock-out given, but one recorded after the new clock-in | The recorded clock-out is kept |
| No clock-out, and the day has passed | Closes as a missed checkout; send another fix for the clock-out |

An approved time correction can't be undone, because it rewrote the day; correct it with an admin edit.

## Admin edit (Team Day → Edit)

People with `attendance:edit` set any past or current day directly: status
(Present, Late, Half Day, WFH, Absent) and times, always with a reason the
person sees. Leave can't be set here; it comes from leave requests.

## Not built yet (options)

- Lateness policies common in HR systems: "3 late marks in a month = 1 half day" instead of
  an immediate half day, or a monthly limit on Late Arrival requests.
- A monthly attendance lock for payroll, after which only admins can change days.
