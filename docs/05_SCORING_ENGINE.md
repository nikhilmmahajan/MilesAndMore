# 05 — Scoring Engine

## Score Formula

```
Total = Strava Points + Streak Points + COTW Points + Admin Bonus Points
```

All scoring reads from source tables and writes results to `score_cache`.
**Components never calculate scores — they always read from `score_cache`.**

---

## Point Values

| Source | Points | Notes |
|--------|--------|-------|
| Strava activity | 1 pt per minute | All activity types. Flagged activities excluded. |
| COTW full form | `cotw_challenges.participation_pts` | 120 pts in Season 7 |
| COTW assisted | 50% of participation_pts | Rounded down |
| COTW did not do | 0 | |
| COTW winner bonus | `cotw_challenges.winner_bonus_pts` | Admin-set per week |
| Streak completion | From `seasons.track_config` levels | 50 pts/week all levels in Season 7 |
| Admin individual bonus | Admin-set | Max 1×/person/week |
| Admin team bonus | Admin-set | Max 1×/team/week, split equally per member |

---

## Score Recalculation

### When to recalculate

| Trigger | Scope |
|---------|-------|
| After Strava sync cron | All users in active season |
| After daily midnight cron | All users in active season |
| After streak submission | Single user |
| After COTW submission | Single user |
| After admin awards individual bonus | Single user |
| After admin awards team bonus | All team members |
| After admin flags/unflags activity | Single user |

### Full season recalculation (`recalculateSeasonScores`)

1. Fetch all `user_id`s from `team_members` where `season_id = active`
2. For each user, calculate all four point components by summing from source tables
3. Sort all users by `total DESC`
4. Assign `rank` (1-indexed). Store previous `rank` as `prev_rank`
5. Upsert all records into `score_cache` ON CONFLICT (user_id, season_id) DO UPDATE

### Single user recalculation (`recalculateUserScore`)

1. Recalculate the four components for just that user
2. Upsert their `score_cache` row
3. Re-run rank assignment for all users in the season (ranks shift when one score changes)

### Point component queries

**Strava points:**
`SUM(duration_minutes) FROM strava_activities WHERE user_id = X AND season_id = Y AND flagged = false`

**Streak points:**
`SUM(points_awarded) FROM streak_submissions WHERE user_id = X AND season_id = Y`

**COTW points:**
`SUM(cs.points_awarded) FROM cotw_submissions cs JOIN cotw_challenges cc ON cs.cotw_id = cc.id WHERE cs.user_id = X AND cc.season_id = Y`

**Bonus points:**
`SUM(points) FROM bonus_points WHERE user_id = X AND season_id = Y`

---

## Cron Jobs

### `GET /api/cron/leaderboard`
- Auth: Bearer CRON_SECRET
- Runs: daily at midnight PST (08:00 UTC)
- Action: full `recalculateSeasonScores` for active season
- Returns: `{ ok: true, season_id, users_updated, at }`

### `GET /api/cron/leaderboard-teams`
- Auth: Bearer CRON_SECRET
- Runs: every Monday at 06:00 PST (14:00 UTC)
- Action: recalculate `v_team_leaderboard` view (refresh materialized view if used)
- Returns: `{ ok: true, teams_updated, at }`

---

## ScoreBreakdown Component

A collapsible breakdown panel shown when a leaderboard row is tapped/clicked.

Displays four rows:

| Label | Value | Colour |
|-------|-------|--------|
| Strava Activity | `strava_pts` formatted with commas | Blue |
| Streak | `streak_pts` | Green |
| COTW | `cotw_pts` | Purple |
| Bonus | `bonus_pts` | Gold |
| **Total** | `total` | Orange, larger font |

Background: `brand-mid` card. Monospace font for numbers.

---

## Comeback Meter

Shown on the leaderboard for the currently logged-in user if they are > 20 pts behind the leader.

### Calculation

1. `gapToLeader = leaderTotal - myTotal`
2. Calculate user's 4-week average weekly minutes (from `strava_activities` last 28 days)
3. `dailyAvg = weeklyAvg / 7`
4. `daysToClose = ceil(gapToLeader / dailyAvg)` — or null if no recent activity

### Display

A small badge on the leaderboard row:
- Label: "behind leader"
- Value: `-{gap}` in gold monospace
- Optional: "~{daysToClose} days to catch up" in gray

---

## Score Display Rules

- Always show scores with thousands separator (e.g. `1,540`)
- Always show rank as `#1`, `#2`, etc. — never "rank 1"
- Top 3 positions show medal emoji: 🥇 🥈 🥉 instead of rank number
- Rank delta indicator:
  - ▲ N (green) if rank improved
  - ▼ N (red) if rank dropped
  - — (gray) if unchanged
  - No indicator for first-time ranked users
