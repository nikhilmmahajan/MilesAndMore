# 08 — Consistency Streaks

## Overview

Each challenger declares one Consistency Track at the start of a season (locked — cannot change). Every week they submit a Yes/No toggle to confirm they completed their track goals. Points are awarded automatically on "Yes". Bench Warmer mode pauses the streak for up to 2 weeks per season.

---

## Page: `/streaks`

Server component fetching:
- Active season with `track_config`
- User's current enrollment (if any)
- All streak submissions for this user this season
- Current week's submission (if already done)

All data passed to a Client Component for interactivity.

---

## Section 1: Track Enrollment Card

**If not yet enrolled:**

- Heading: "Your Consistency Track"
- Helper text: "Choose your track for this season. Once saved, it cannot be changed."
- Track selector (shadcn Select) — options populated from `seasons.track_config`
- Level selector (shadcn Select) — options appear after track is selected, from that track's `levels` array
- Points preview: "Earns {N} pts/week for a Yes submission"
- "Lock In My Track" button (`bg-brand-orange`)
- On submit: POST to `/api/streaks/enroll` — if successful, page refreshes and enrollment is locked

**If already enrolled:**

- Shows the locked track name and level
- "Earns {N} pts/week" stat
- Green "Locked" badge on the right
- No edit control — enrollment is permanent for the season

---

## Section 2: This Week's Submission

Only shown if user is enrolled.

Header shows "This Week" and the week date range.

**If not yet submitted this week:**

Display text: "Did you complete your {track_name} goals this week?"

Three action options:
1. **"✅ Yes, I did it!"** — green button → calls `/api/streaks/submit` with `completed: true`
2. **"❌ Not this week"** — outline button → calls submit with `completed: false`
3. **"🪑 Declare Bench"** — ghost button below, yellow text → calls submit with `bench_mode: true`
   - Shows tooltip: "Vacation or illness — streak paused, not broken. Max 2 per season."
   - If user has already used both bench weeks: disable this button with message "Both bench weeks used"

**If already submitted:**

Show a status badge:
- ✅ Done (green) — if `completed = true`
- ❌ Missed (gray) — if `completed = false` and not bench
- 🪑 Bench (yellow) — if `bench_mode = true`

Show points awarded if positive: "+{N} pts" in gold.

---

## Section 3: Streak Calendar Heatmap

Only shown if there are any submissions.

Heading: "Your Season Streak"

A row of square tiles, one per week submitted:

| State | Background | Border | Label |
|-------|-----------|--------|-------|
| Completed | `bg-green-700` | green | ✓ |
| Missed | `bg-gray-800` | gray | ✗ |
| Bench | `bg-yellow-700/60` | yellow | 🪑 |

Tile size: 40×40px, rounded-lg. Tooltip on hover: "Week of {date}: {status}, {N} pts"

---

## API Routes

### `POST /api/streaks/enroll`
Request body: `{ track_name: string, level: string }`

Steps:
1. `requireUser()`
2. Check active season exists
3. Check user not already enrolled — if they are, return 400
4. Insert into `streak_enrollments`
5. Return `{ ok: true }`

### `POST /api/streaks/submit`
Request body: `{ week_start_date: string, completed: boolean, bench_mode?: boolean }`

Steps:
1. `requireUser()`
2. Check active season + user enrollment exist
3. If `bench_mode = true`: count existing bench rows for this user/season — if already 2, return 400
4. Look up `points_per_week` from `seasons.track_config` matching user's enrolled track + level
5. `points_awarded = completed ? points_per_week : 0`
6. If `bench_mode = true`: `completed = false`, `points_awarded = 0`
7. Upsert into `streak_submissions` ON CONFLICT (user_id, season_id, week_start_date) DO UPDATE
8. Call `recalculateUserScore(userId, seasonId)` (scoring engine)
9. If `completed = true`: call `triggerPulseEvent` with type `streak_complete`
10. Return `{ ok: true, points_awarded }`

---

## Deadline Logic

The submission window for a given week:
- Opens: Monday 00:00 PST
- Closes: Sunday 23:59 PST
- If no submission by Sunday: week counts as a No (missed) — handled by the scoring engine reading absence of a row as 0 points. **Do not auto-create missed rows** — absence = 0.

The UI should show the deadline clearly: "Submit by Sunday midnight PST"

---

## Bench Warmer Rules

| Rule | Detail |
|------|--------|
| Max bench weeks | 2 per user per season |
| Effect on streak | Streak counter is neither incremented nor broken |
| Effect on points | 0 points awarded |
| Effect on Pulse | Auto-post with `bench_declared` event type |
| Can un-bench? | No — bench declarations are final |
