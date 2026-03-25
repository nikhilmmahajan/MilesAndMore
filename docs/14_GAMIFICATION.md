# 14 — Gamification Mechanics

## Overview

Five automatic gamification mechanics trigger Pulse events and visual rewards. All logic runs server-side inside API routes or after the Strava sync.

---

## 1. Hot Streak Badge 🔥

**Trigger:** A user has logged at least one Strava activity on each of the last 7 consecutive calendar days.

**Check location:** Called from the Strava sync pipeline after activities are upserted for each user.

**Logic:**
1. Fetch this user's activities for the past 7 days from `strava_activities`
2. Check that each day in the 7-day window has at least one activity row
3. Before posting, check `pulse_posts` for a `hot_streak` event from this user in the past 7 days — if one exists, skip (avoid spam)
4. If conditions met and no recent post exists: call `triggerPulseEvent` with type `hot_streak`

**Pulse post text:** "{Name} just hit 7 consecutive activity days. Absolute fire! 🔥"

**Leaderboard badge:** A 🔥 badge shown on the user's leaderboard row for 7 days after trigger.

---

## 2. First Submission Badge

**Trigger:** A user is the first to submit a `full_form` COTW entry for the current week's challenge.

**Check location:** Inside `POST /api/cotw/submit` handler.

**Logic:**
1. After inserting the submission, count all existing `full_form` submissions for this `cotw_id`
2. If the count is exactly 1 (this user is first): trigger the badge
3. Call `triggerPulseEvent` with type `cotw_submission` and include `"first_submission": true` in metadata

**Pulse post text:** "{Name} was first to nail this week's COTW! ⚡ Early mover!"

---

## 3. Milestone Celebrations 🎯

**Trigger:** A user's cumulative Strava minutes crosses a threshold for the first time.

**Thresholds:** 500, 1000, 1500, 2000, 3000 minutes

**Check location:** Called from `recalculateUserScore` after updating `score_cache`.

**Logic:**
1. Before updating score_cache, record previous `strava_pts`
2. After update, compare new `strava_pts` against thresholds
3. For each threshold crossed (previous < threshold ≤ new): trigger celebration
4. Check `pulse_posts` for a `milestone` event at this threshold for this user — if exists, skip (idempotent)

**Pulse post text:** "🎯 {Name} just crossed {N} total season minutes! Incredible!"

---

## 4. Rivalry Mode ⚔️

Challengers can challenge another challenger to a head-to-head comparison for the season.

**Create rivalry:** `POST /api/rivalries/create`
- Body: `{ opponent_id: uuid }`
- Inserts into `rivalries` table
- Calls `triggerPulseEvent` with type `rivalry_started`
- Returns the rivalry record

**Pulse post text:** "⚔️ {Challenger} has challenged {Opponent} to a head-to-head rivalry!"

**Rivalry display (on profile pages):**
- Show a mini-leaderboard with just the two challengers
- Side-by-side score comparison: Strava pts, Streak pts, COTW pts, Total
- Who's ahead shown in orange

**Constraint:** One active rivalry per (challenger, opponent, season) pair. The challenger can issue a rivalry but the opponent does not need to "accept" — it's visible to both immediately.

---

## 5. Season Passport

A visual "stamp card" showing every completed COTW and streak week across all seasons.

**Location:** Shown on the challenger's profile page (`/profile/[id]`)

**Data source:**
- `cotw_submissions` where `user_id = X` and `participation != 'did_not_do'` across all seasons
- `streak_submissions` where `user_id = X` and `completed = true` across all seasons
- Grouped by season

**Display:**
One card per season. Inside each card:
- Season name
- Total points that season
- Row of COTW stamp squares (one per challenge week)
  - Green = participated, gray = missed
- Streak completion count "{N} weeks completed"

This is a permanent collectible history of the challenger's entire Almaden Fit AF journey.

---

## 6. Season Wrapped (End-of-Season)

Generated when a season transitions to `archived` status.

**Per-challenger graphic includes:**
- Total points and final rank
- Best single week (most points)
- Favourite activity type (most minutes)
- COTW completion rate
- Team contribution (% of team total)
- Weeks of streak completed
- A quote from the coach (if configured)

**Implementation:** This can be an HTML canvas render or a server-side SVG. Generate on demand when challenger visits their profile for an archived season, or pre-generate when admin archives a season. The graphic should be shareable (downloadable PNG or shareable URL).
