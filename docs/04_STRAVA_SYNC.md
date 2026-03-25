# 04 — Strava Activity Sync

## Overview

A cron job runs every 12 hours and fetches new Strava activities for every connected user. Activities are upserted into `strava_activities`. After sync, scores are recalculated. Manual import records coexist with live sync records — they are never overwritten.

---

## Sync Trigger

| Route | `GET /api/cron/strava-sync` |
|-------|----------------------------|
| Auth | `Authorization: Bearer {CRON_SECRET}` header required |
| Called by | Vercel Cron — every 12 hours |
| Also callable | Manually by admin via admin panel "Force Sync" button |

---

## Sync Pipeline (per user)

Process all connected users in batches of 10 (to avoid Strava rate limits). 1-second pause between batches.

### Step 1 — Select eligible users
Query `users` where `strava_access_token IS NOT NULL`.

### Step 2 — Token freshness check
For each user, check `strava_token_expires_at`. If it expires within 5 minutes:
- Call Strava token refresh endpoint
- Update `strava_access_token`, `strava_refresh_token`, `strava_token_expires_at` in DB
- If refresh fails: log error, skip user this cycle

### Step 3 — Determine fetch window
Set `after` timestamp = `last_synced_at` (Unix). If `last_synced_at` is null, use `season.start_date`.

### Step 4 — Fetch activities from Strava
`GET https://www.strava.com/api/v3/athlete/activities?after={unix}&per_page=100&page={n}`

Paginate until empty response. Max 200 activities total per user per sync cycle.

Fields to extract per activity:
- `id` → `strava_activity_id`
- `sport_type` (preferred) or `type` → normalise to `activity_type`
- `moving_time` / 60 → `duration_minutes` (integer, round down)
- `distance` / 1000 → `distance_km`
- `total_elevation_gain` → `elevation_gain_m`
- `start_date` → derive `week_start_date` (Monday of that ISO week)

### Step 5 — Upsert activities
INSERT with conflict strategy:
- `ON CONFLICT (strava_activity_id) DO NOTHING` — never overwrite live sync records
- Set `source = 'strava_sync'`, `flagged = false`

### Step 6 — Update `last_synced_at`
Set `users.last_synced_at = now()` regardless of whether any new activities were found.

### Step 7 — Trigger score recalculation
After all users are synced, call the scoring engine to recalculate `score_cache` for the active season.

---

## Activity Type Normalisation

| Strava type | Stored as |
|-------------|-----------|
| Run, VirtualRun | Run |
| Walk | Walk |
| Hike | Hike |
| Ride, VirtualRide, EBikeRide | Ride |
| Swim | Swim |
| WeightTraining, Workout | Workout |
| Yoga, Pilates | Yoga |
| Rowing | Rowing |
| anything else | Other |

---

## Deduplication Rules

| Scenario | Behaviour |
|----------|-----------|
| Live sync fetches activity already in DB (`strava_activity_id` exists) | Skip — DO NOTHING |
| Week already has a `manual_import` row | Do NOT skip — live sync creates a separate row for the same week. Both rows count towards score. This is correct: manual import covers Jan26–Mar09; live sync covers new activities after go-live. |
| Same week, same source (two sync runs) | Prevented by unique constraint on `strava_activity_id` |

---

## Cron Schedule

Configured in `vercel.json`:

| Job | Route | Schedule (UTC) |
|-----|-------|----------------|
| Strava sync | `/api/cron/strava-sync` | Every 12 hours: `0 */12 * * *` |
| Leaderboard recalc | `/api/cron/leaderboard` | Daily midnight PST = `0 8 * * *` |
| Team leaderboard | `/api/cron/leaderboard-teams` | Monday 6 AM PST = `0 14 * * 1` |

---

## Response Format

The cron route returns JSON:
```json
{
  "synced": 87,
  "errors": 2,
  "season_id": "uuid",
  "triggered_recalc": true
}
```

Errors are logged server-side per user but do not halt the full batch.

---

## Manual Import Coexistence

The migration script imports weekly Strava minute aggregates as `source = 'manual_import'`. These rows represent Jan26–Mar09 data. When the live sync begins:

- It fetches activities AFTER `season.start_date` (Jan 26) — so technically there is overlap
- However, dedup is by `strava_activity_id` which manual import rows don't have
- **Both rows coexist and both contribute to score**
- This is intentional: the manual import was a weekly total aggregate; live sync adds individual activities

If you want strict dedup (no double-counting overlap weeks), the admin can flag the manual_import rows for specific weeks after go-live. Flagged rows are excluded from scoring.
