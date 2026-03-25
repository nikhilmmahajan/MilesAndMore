# 02 — Database Schema

All tables live in the `public` schema in Supabase (PostgreSQL 15).
Row Level Security is enabled on every table.
The service-role client bypasses RLS and is used by cron jobs, admin endpoints, and the migration script.

---

## Extensions Required

- `uuid-ossp` — UUID generation
- `pg_trgm` — trigram indexes for fuzzy user name search

---

## Table Overview

| Table | Purpose | Imported from Sheet |
|-------|---------|-------------------|
| `users` | All challengers | Yes — Master Tracking |
| `seasons` | Season definitions | Manually created |
| `teams` | Team records | Yes — Team tab |
| `team_members` | Team membership per season | Yes — Team tab |
| `strava_activities` | Per-user activity records | Yes — weekly tabs |
| `streak_enrollments` | Track + level declaration per season | Yes — Streak Declarations |
| `streak_submissions` | Weekly Yes/No per user | Yes — Master Tracking streak columns |
| `cotw_challenges` | Weekly challenge definitions | Yes — COTW Weekly Tracking |
| `cotw_submissions` | Per-user COTW entries | Yes — COTW Weekly Tracking |
| `cotw_winners` | Declared weekly champions | Manually set post-import |
| `bonus_points` | Admin-awarded bonus points | Not in sheet |
| `score_cache` | Pre-computed total scores + ranks | Rebuilt by migration |
| `pulse_posts` | Social feed events | Not imported |
| `kudos` | Peer kudos messages | Not imported |
| `rivalries` | Head-to-head challenges | Not imported |
| `hall_of_fame` | End-of-season awards | Manually populated |

---

## Table: `users`

Primary identity table. `strava_id` is the core key — challengers imported from the sheet will auto-link when they log in via Strava OAuth.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default gen_random_uuid() | Internal DB ID |
| `strava_id` | bigint | UNIQUE, NOT NULL | Strava athlete ID — never changes |
| `email` | text | UNIQUE | From Master Tracking col A |
| `name` | text | NOT NULL | Display name |
| `strava_url` | text | | `https://www.strava.com/athletes/{id}` |
| `photo_url` | text | | Profile photo from Strava |
| `gender` | char(1) | CHECK IN ('M','F') | From Master Tracking col E |
| `is_admin` | boolean | NOT NULL, default false | Set manually for the coach |
| `strava_access_token` | text | | Populated on first OAuth login |
| `strava_refresh_token` | text | | Populated on first OAuth login |
| `strava_token_expires_at` | timestamptz | | Unix epoch from Strava, stored as timestamptz |
| `last_synced_at` | timestamptz | | Updated by 12-hr sync cron |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Indexes:** `strava_id`, `name` (trigram for search)

**RLS:**
- SELECT: anyone (public leaderboard needs this)
- UPDATE: own record only
- All other writes: service role only

---

## Table: `seasons`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK | |
| `name` | text | NOT NULL | e.g. "Season 7" |
| `start_date` | date | NOT NULL | Strava sync begins from this date |
| `end_date` | date | NOT NULL | Data cutoff |
| `status` | text | CHECK IN ('active','archived','upcoming') | Only one 'active' allowed (unique partial index) |
| `track_config` | jsonb | NOT NULL, default '[]' | Array of streak track definitions |
| `created_at` | timestamptz | NOT NULL, default now() | |

**`track_config` structure:**
```json
[
  {
    "name": "Running",
    "levels": [
      { "label": "Beginner",     "points_per_week": 50 },
      { "label": "Intermediate", "points_per_week": 50 },
      { "label": "Advanced",     "points_per_week": 50 }
    ]
  }
]
```

Season 7 tracks: Running, Walking, Strength/weight/resistance, Yoga/Mobility, Cycling, Pushup/pullups, Rowing. All 50 pts/week at every level.

**Unique constraint:** Partial unique index on `status` WHERE `status = 'active'` — prevents two active seasons.

**RLS:**
- SELECT: anyone
- All mutations: admin only

---

## Table: `teams`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | Cascade delete |
| `name` | text | e.g. "Udaan Pari" |
| `color` | text | Hex without `#`, e.g. `F5A623` |
| `logo_url` | text | Stored in Supabase Storage |
| `captain_user_id` | uuid FK → users | Nullable — set in admin UI |
| `created_at` | timestamptz | |

**Unique:** `(season_id, name)`

**Season 7 teams and colours:**

| Team name | Hex colour |
|-----------|-----------|
| Udaan Pari | F5A623 |
| Sheetal Devi Arrows | 27AE60 |
| Messy Messies | 8E44AD |
| Dhoni Dhurandhars | 2980B9 |
| Holy Kohli | E8500A |
| Almaden Bolts | C0392B |

**RLS:** SELECT anyone, mutations admin only

---

## Table: `team_members`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `team_id` | uuid FK → teams | |
| `user_id` | uuid FK → users | |
| `season_id` | uuid FK → seasons | |
| `is_captain` | boolean | Green highlight in Team tab |
| `is_core` | boolean | Yellow highlight in Team tab |

**Unique:** `(user_id, season_id)` — one team per person per season

**Indexes:** `season_id`, `team_id`, `user_id`

**RLS:** SELECT anyone, mutations admin only

---

## Table: `strava_activities`

One row per Strava activity (live sync) or one row per user per week (manual import).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `season_id` | uuid FK → seasons | |
| `strava_activity_id` | bigint | NULL for manual_import rows; unique for live sync |
| `week_start_date` | date | Monday of the activity week |
| `duration_minutes` | integer | Minutes of activity (scored 1 pt/min) |
| `activity_count` | integer | Number of activities (manual import only) |
| `distance_km` | numeric(8,2) | |
| `elevation_gain_m` | numeric(8,1) | |
| `activity_type` | text | 'mixed' for imports; specific type from Strava (Run, Walk, Ride, etc.) |
| `source` | text | `'strava_sync'` or `'manual_import'` |
| `flagged` | boolean | Admin-flagged as non-fitness; excluded from scoring |
| `created_at` | timestamptz | |

**Unique constraints (both deferred):**
- `strava_activity_id` (where not null) — prevents duplicate live sync
- `(user_id, week_start_date, source)` — prevents duplicate manual imports

**Indexes:** `(user_id, season_id)`, `week_start_date`, `flagged WHERE TRUE`

**RLS:** SELECT anyone, writes via service role only

---

## Table: `streak_enrollments`

One row per user per season — locked after creation, cannot change mid-season.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `season_id` | uuid FK → seasons | |
| `track_name` | text | Must match a name in `seasons.track_config` |
| `level` | text | CHECK IN ('Beginner','Intermediate','Advanced') |
| `declared_at` | timestamptz | Form submission timestamp |

**Unique:** `(user_id, season_id)` — one enrollment per person per season

**RLS:** SELECT anyone, INSERT own record only, other mutations admin only

---

## Table: `streak_submissions`

Weekly Yes/No record per user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `season_id` | uuid FK → seasons | |
| `week_start_date` | date | Monday of the week |
| `completed` | boolean | true = streak done |
| `points_awarded` | integer | From track_config; 0 if bench or missed |
| `bench_mode` | boolean | Streak paused, not broken |
| `source` | text | `'user'` or `'manual_import'` |
| `submitted_at` | timestamptz | |

**Unique:** `(user_id, season_id, week_start_date)` — one submission per week

**Bench warmer limit:** Max 2 bench declarations per `(user_id, season_id)` enforced at API level.

**RLS:** SELECT anyone, INSERT own record, mutations admin only

---

## Table: `cotw_challenges`

One row per week per season.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | |
| `week_start_date` | date | Monday of the challenge week |
| `title` | text | e.g. "3-Minute Plank Hold" |
| `description` | text | Full challenge description |
| `video_url` | text | Optional demo video link |
| `scoring_rules` | jsonb | Flexible scoring structure |
| `participation_pts` | integer | Points for full_form participation (120 in S7) |
| `winner_bonus_pts` | integer | Extra pts for declared winner |
| `voting_enabled` | boolean | Whether challenger voting is active |
| `voting_options` | jsonb | `[{label, votes}]` when voting is on |
| `voting_deadline` | timestamptz | When voting closes |
| `created_at` | timestamptz | |

**Unique:** `(season_id, week_start_date)`

**RLS:** SELECT anyone, mutations admin only

---

## Table: `cotw_submissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `cotw_id` | uuid FK → cotw_challenges | |
| `participation` | text | CHECK IN ('did_not_do','assisted','full_form') |
| `score_text` | text | Raw score string e.g. "21(5+5+5)=315" |
| `strava_notes` | text | Optional Strava activity notes |
| `proof_url` | text | Supabase Storage URL |
| `points_awarded` | integer | `full_form` = participation_pts, `assisted` = 50%, `did_not_do` = 0 |
| `submitted_at` | timestamptz | |
| `source` | text | `'user'` or `'manual_import'` |

**Unique:** `(user_id, cotw_id)`

**RLS:** SELECT anyone, INSERT/UPDATE own record, other mutations admin only

---

## Table: `cotw_winners`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `cotw_id` | uuid FK → cotw_challenges | |
| `user_id` | uuid FK → users | |
| `gender` | char(1) | 'M' or 'F' |
| `declared_at` | timestamptz | |
| `admin_id` | uuid FK → users | Who declared the winner |

**Unique:** `(cotw_id, gender)` — one winner per gender per week

**RLS:** SELECT anyone, mutations admin only

---

## Table: `bonus_points`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | Recipient |
| `team_id` | uuid FK → teams | Nullable — null = individual bonus |
| `season_id` | uuid FK → seasons | |
| `week_start_date` | date | Week the bonus applies to |
| `points` | integer | Bonus amount |
| `reason` | text | Admin-entered reason (required) |
| `awarded_by` | uuid FK → users | Admin who awarded |
| `created_at` | timestamptz | |

**Business rule:** Max 1 individual bonus per person per week; max 1 team bonus per team per week. Enforced at API level.

**RLS:** SELECT anyone, mutations admin only

---

## Table: `score_cache`

Pre-computed scores. Never edited by challengers. Only written by the scoring engine.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `season_id` | uuid FK → seasons | |
| `strava_pts` | integer | SUM(duration_minutes) WHERE NOT flagged |
| `streak_pts` | integer | SUM(streak_submissions.points_awarded) |
| `cotw_pts` | integer | SUM(cotw_submissions.points_awarded) for this season's COTWs |
| `bonus_pts` | integer | SUM(bonus_points.points) |
| `total` | integer | strava + streak + cotw + bonus |
| `rank` | integer | Computed after each full recalculation |
| `prev_rank` | integer | Rank before last recalculation (for delta indicator) |
| `last_calculated` | timestamptz | |

**Unique:** `(user_id, season_id)`

**Index:** `(season_id, total DESC)` for fast leaderboard queries

**RLS:** SELECT anyone, writes service role only

---

## Table: `pulse_posts`

The social feed. Realtime enabled.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | Post author |
| `season_id` | uuid FK → seasons | |
| `event_type` | text | See event type table below |
| `content` | text | Display text of the post |
| `media_url` | text | Optional image/video URL |
| `is_pinned` | boolean | Coach's Corner posts pinned for 48h |
| `reactions` | jsonb | `{"🔥": 5, "💪": 3}` — updated in place |
| `metadata` | jsonb | Extra event-specific data |
| `created_at` | timestamptz | |

**Valid event types:**

| Event type | Generated by | Description |
|-----------|-------------|-------------|
| `cotw_winner` | Admin action | COTW champion declared |
| `coaches_corner` | Admin post | Weekly pinned coach commentary |
| `hot_streak` | Auto — gamification engine | 7 consecutive activity days |
| `streak_complete` | Auto — streak submit API | Weekly streak confirmed |
| `cotw_submission` | Auto — COTW submit API | Challenge completed |
| `milestone` | Auto — gamification engine | 500/1000/2000+ minutes reached |
| `kudos_received` | Auto — kudos API | Kudos sent between challengers |
| `story` | Challenger | Manual text/photo post |
| `announcement` | Admin | Broadcast to all challengers |
| `rivalry_started` | Auto — rivalry API | 1v1 challenge issued |

**Index:** `(season_id, created_at DESC)`, `is_pinned`

**Realtime:** Enable postgres_changes INSERT for this table — see `18_DEPLOYMENT.md`

**RLS:** SELECT anyone, INSERT own record or service role, mutations admin only

---

## Table: `kudos`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sender_id` | uuid FK → users | |
| `recipient_id` | uuid FK → users | |
| `message` | text | |
| `season_id` | uuid FK → seasons | |
| `created_at` | timestamptz | |

**RLS:** SELECT anyone, INSERT sender only

---

## Table: `rivalries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `challenger_id` | uuid FK → users | Who issued the challenge |
| `opponent_id` | uuid FK → users | Who was challenged |
| `season_id` | uuid FK → seasons | |
| `status` | text | CHECK IN ('active','resolved') |
| `created_at` | timestamptz | |

**Unique:** `(challenger_id, opponent_id, season_id)` — one active rivalry per pairing

**RLS:** SELECT anyone, INSERT challenger only

---

## Table: `hall_of_fame`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | |
| `category` | text | See categories below |
| `user_id` | uuid FK → users | Nullable — null for team awards |
| `team_id` | uuid FK → teams | Nullable — null for individual awards |
| `value` | text | e.g. score, minutes, streak count |
| `week_start_date` | date | For weekly COTW awards |
| `created_at` | timestamptz | |

**Valid categories:**

| Category | Award |
|----------|-------|
| `cotw_weekly_champion_m` | Male COTW winner for a given week |
| `cotw_weekly_champion_f` | Female COTW winner for a given week |
| `season_streak_champion` | Longest unbroken streak over the season |
| `season_top_scorer_m` | Highest individual male score |
| `season_top_scorer_f` | Highest individual female score |
| `season_team_champion` | Winning team with all members |
| `most_minutes` | Most Strava activity minutes in the season |

**RLS:** SELECT anyone, mutations admin only

---

## Views

Two materialised views for fast leaderboard queries:

### `v_leaderboard`
Joins `score_cache` → `users` → `team_members` → `teams`. Returns one row per user per season with: `rank`, `prev_rank`, `total`, `strava_pts`, `streak_pts`, `cotw_pts`, `bonus_pts`, `season_id`, `user_id`, `name`, `photo_url`, `gender`, `team_id`, `team_name`, `team_color`.
Ordered by `rank ASC`.

### `v_team_leaderboard`
Groups `score_cache` by team via `team_members`. Returns: `team_id`, `team_name`, `color`, `season_id`, `total_pts` (sum), `member_count`, `rank` (window function over season). Ordered by rank.

---

## Nudges Table

> **Not in schema yet — add before launch**

A `nudges` table is needed for the admin Whisper Nudge feature (see `11_ADMIN_PANEL.md`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sender_id` | uuid FK → users | Admin who sent it |
| `recipient_id` | uuid FK → users | Challenger who receives it |
| `message` | text | Private message |
| `is_read` | boolean | default false |
| `created_at` | timestamptz | |

**RLS:** SELECT own record only (recipient), INSERT admin only
