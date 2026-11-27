# Attendance: Misuse Plan

A plan to close the ways attendance can be gamed, before changing more code.
Nothing here is built yet. Each item says what someone could do today, how
bad it is, and what we could do about it. Decisions needed are at the end.

## The approach

1. **Block the cheap tricks.** If something can be abused with one tap, it needs a rule.
2. **Make the rest visible.** We can't stop every lie on a phone. We can make
   sure the approver and HR see the pattern (counts, locations, history).
3. **Don't punish honest people.** One genuine late day or forgotten clock-out
   should stay easy. Limits apply to repeat use.
4. **Someone above the approver can check.** Team leads approve day to day;
   HR sees everything and gets the unusual cases.

## Where it can be misused today

Risk: **High** = easy and affects pay or hours; **Medium** = needs effort or
is visible; **Low** = edge case.

### Clocking in and out

| # | What someone could do | Why it works today | Risk | What we could do |
|---|---|---|---|---|
| 1 | **Skip clocking in, then send Correct My Time every day** | A time correction needs no location. It's a way around the office location check | High | Monthly limit (e.g. 3); approver sees "4th this month"; past the limit it goes to HR |
| 2 | **Clock in at the office, go home, clock out at 7 PM from home** | Clock-out location is saved but never checked | High | Flag "clocked out away from the office" on office days; show it on Team Day and in a report |
| 3 | **Clock out, come back hours later, Clock In Again** | ~~Hours counted from the first clock-in~~ **Stopped:** one clock-in and one clock-out per day | Done | If it comes back: count only time actually clocked in (add up each in–out) |
| 4 | **Clock in on a Sunday or holiday from home** | Days off need no location and no approval; every minute is overtime | High | Day-off work needs approval (a "Work on Day Off" request), or counts as unapproved until an approver confirms it |
| 5 | **Fake GPS app** | The browser sends the location; the server can only check accuracy | Medium | Flag exact same coordinates every day or a perfect accuracy reading; optional office Wi-Fi check; random spot checks |
| 6 | **Colleague clocks in with your login** | Any signed-in device can clock in | Medium | Remember each person's device; flag a clock-in from a new device; optional selfie |
| 7 | **Forget the second clock-out** | Can't happen now: there is no second clock-in | Done | — |

### Requests

| # | What someone could do | Why it works today | Risk | What we could do |
|---|---|---|---|---|
| 8 | **Late Arrival every day** | No limit | High | Monthly limit (e.g. 3); approver sees the count; past the limit only HR can approve |
| 9 | **Late Arrival "arrive by 6:30 PM"** and get a full day for half an hour | Arrive-by can be any time before office end | High | Arrive-by no later than a set time (e.g. 1:00 PM); later than that is half-day leave. Turn on the minimum-hours rule |
| 10 | **Send WFH at the last minute, clock in from home, nobody decides** | A pending WFH stays WFH until someone rejects it | Medium | Pending WFH not decided in 2 working days goes to HR; still pending at month end counts as Absent |
| 11 | **Correct My Time with made-up times** | The approver can't see evidence | Medium | Show the approver what's recorded (clock-in, location, device), the person's corrections this month, and the gap |
| 12 | **Cancel and resend to find a softer approver** | Any approver can decide | Low | Show the approver earlier rejected requests for the same day |

### Approvers and admins

| # | What someone could do | Why it works today | Risk | What we could do |
|---|---|---|---|---|
| 13 | **Team lead approves everything for their team** | No one reviews approvals | Medium | HR report: approvals per approver and approval rate; corrections and late arrivals past the limit need HR |
| 14 | **Admin edits a friend's day** | Allowed with a reason; on record | Medium | Monthly report of admin edits; edits to a closed month need a second admin |
| 15 | **Undo a decision to change it quietly** | Undo is allowed with a reason | Low | Already on record; include in the report |
| 16 | **Change last month after payroll** | Any day in the last 31 days can change | Medium | **Month lock:** after payroll, a month can only be changed by HR, with a reason |

### Punch API (biometric devices / integrations)

| # | What someone could do | Why it works today | Risk | What we could do |
|---|---|---|---|---|
| 17 | **Punch anyone in at any time with the API key** | One shared key; any timestamp is accepted, past or future; location accuracy isn't checked | High if the key leaks | One key per device; accept only times within a few minutes of now (or a short offline window); limit to the device's IP; log which device punched |

## Tools we'd use (most items share these)

- **Monthly limits** per person: Late Arrival, Correct My Time. Past the limit → HR approves.
- **Context for approvers** on every request: how many this month, what's recorded, where they clocked in and out, earlier rejections.
- **Flags** on the day (shown on Team Day, never blocking): clocked out away from the office, new device, same GPS as yesterday, re-clock-in, day-off work.
- **Exceptions report** for HR, monthly: late days, corrections, late arrivals, flags, admin edits, approvals per approver.
- **Month lock** after payroll.
- **Per-device API keys** with a time window.

## Suggested order

| Phase | What | Why first |
|---|---|---|
| 1 | Limits on Late Arrival and Correct My Time; arrive-by latest time; approver sees counts | Closes the easiest, highest-risk holes (1, 8, 9) with little work |
| 2 | Count only clocked-in time; keep hours on a missed second clock-out; day-off work needs approval | Fixes hours and overtime (3, 4, 7) |
| 3 | Clock-out location flag; exceptions report for HR; pending WFH goes to HR | Makes the rest visible (2, 10, 13, 14) |
| 4 | Punch API: per-device keys, time window, IP | Only if a device or integration uses it (17) |
| 5 | Month lock; new-device and GPS flags; optional selfie or Wi-Fi | Payroll safety and harder cheating (5, 6, 16) |

## Decisions needed

1. **Monthly limits:** how many Late Arrivals and how many time corrections per person per month? Suggestion: 3 each. Past that, only HR approves.
2. **Who is "HR" for escalations:** Admins, or people with the leave-approve permission?
3. **Latest arrive-by time:** suggestion 1:00 PM. Later than that is half-day leave.
4. **Minimum hours for a full day:** turn it on? Suggestion: 6 hours on office days.
5. **Working on a day off:** needs approval before it counts (and before overtime counts)?
6. ~~Clock In Again~~: stopped for now (one clock-in and one clock-out per day). Decide later whether evening work from home should count.
7. **Pending WFH nobody decides:** after how many days does it go to HR?
8. **Month lock:** which day of the next month does the previous month lock?
9. **Punch API:** is it used by a biometric device or anything else today? If not, turn it off until needed.
10. **Selfie or office Wi-Fi checks:** wanted now, or later?
