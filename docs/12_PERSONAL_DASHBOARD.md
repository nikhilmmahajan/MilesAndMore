# 12 — Personal Dashboard

## Overview

Each challenger has a personal analytics dashboard at `/dashboard`. It shows their current standing, score breakdown, and historical charts for the active season.

---

## Page: `/dashboard`

Server component fetching for the logged-in user:
- Their `score_cache` row for the active season
- Their `strava_activities` for the active season
- Their `streak_submissions` for the active season
- Their COTW submission history

---

## Layout Sections

### 1. User Header
- Large avatar (56px circle, border in brand-orange)
- Display name (large, bold, white)
- Season name (small gray)
- Overall rank: large monospace `#N` on the right

### 2. Score Breakdown Card
The `ScoreBreakdown` component (see `05_SCORING_ENGINE.md`) displayed prominently.
Shows four rows: Strava Activity, Streak, COTW, Bonus → Total.

### 3. Cumulative Point Progression Chart
- Type: `LineChart` (Recharts)
- X-axis: week labels
- Y-axis: cumulative points
- Two lines:
  - Cumulative total (orange solid)
  - Weekly Strava minutes (gold dashed, for trend context)
- Height: 220px

### 4. Activity Mix Charts (side by side)

Left: **Activity Distribution Donut**
- Type: `PieChart`
- Data: minutes per activity type
- Colour coded by activity type (see `04_STRAVA_SYNC.md`)

Right: **Minutes by Activity Type**
- Type: `BarChart` horizontal layout
- X-axis: minutes, Y-axis: activity type
- Same colour coding

### 5. Streak History Calendar
The `StreakCalendar` heatmap (see `08_STREAKS.md`). Heading: "Streak History".

### 6. COTW Participation Summary
Simple stat: "{N} of {total_weeks} COTWs participated" with a progress bar in purple.

---

## Data Queries

**Score:** `score_cache` where `user_id + season_id`
**Activities:** `strava_activities` where `user_id + season_id + not flagged`, ordered by `week_start_date`
**Streaks:** `streak_submissions` where `user_id + season_id`, ordered by `week_start_date`
**COTW rate:** Count `cotw_submissions` where `user_id` and `participation != 'did_not_do'` / total challenge weeks
