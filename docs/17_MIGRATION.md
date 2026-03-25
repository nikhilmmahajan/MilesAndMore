# 17 — Data Migration (Python Script)

## Overview

A one-time Python migration script (`scripts/migrate_almaden.py`) reads the live Season 7 Google Sheet and populates the Supabase database. It is idempotent — safe to re-run; all writes are upserts.

---

## Prerequisites

```
pip install gspread pandas supabase python-dotenv fuzzywuzzy python-Levenshtein
```

- Google Service Account JSON key with read access to the sheet
- `.env` file with all required variables
- Season 7 row must be **manually created in Supabase first** — the UUID is needed as `SEASON_7_ID`
- The 6 team rows must be seeded (via the SQL in `02_DATABASE_SCHEMA.md`)

---

## Environment Variables (Python script)

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
GOOGLE_CREDENTIALS_PATH        # path to service_account.json
SPREADSHEET_ID                 # 15MDxg-V6dE72RnE5Od_Q9eSYQZ4-ePDwt7lDku8LisQ
SEASON_7_ID                    # UUID of the Season 7 row you created manually
```

---

## Usage

```bash
# Dry run — parses everything, prints what would happen, writes nothing
python migrate_almaden.py --dry-run

# Live run
python migrate_almaden.py
```

---

## Sheet Source Tabs

| Tab | Role | Action |
|-----|------|--------|
| Master Tracking | PRIMARY SOURCE for users, weekly Strava minutes, streak history | Import |
| Team | Teams + members, captains, core | Import |
| Jan26, Feb02, Feb09, Feb16, Feb23, Mar02, Mar09 | Weekly activity detail | Import |
| Streak Declarations | Track + level per user | Import |
| COTW Weekly Tracking | COTW submissions + participation points | Import |
| Solo Leaderboard, Team Leaderboard, Pivot Table 9, etc. | Calculated views | Skip — rebuilt by DB |
| Who 'dis? | Phone numbers without name match | Skip — no PII linkage |

---

## Phase 1: Users

**Source:** Master Tracking tab

**Column mapping (0-indexed after header row):**

| Column | Index | DB field |
|--------|-------|---------|
| Email | 0 | `users.email` |
| Name | 1 | `users.name` |
| Strava URL | 2 | `users.strava_url` |
| Strava ID | 3 | `users.strava_id` |
| Gender | 4 | `users.gender` |
| Team Name | 9 | Used for validation only |
| Weekly minutes | 10+ | Handled in Phase 3 |
| Weekly streak | 22+ | Handled in Phase 5 |

**Steps:**
1. Detect header row (row where col A = "Email")
2. For each data row: extract and clean fields
3. If `Team = "Not Found"`: log `MISSING_TEAM` error but continue
4. Upsert into `users` ON CONFLICT `strava_id`
5. After upsert, fetch all users to build `name → user_id` and `email → user_id` maps

---

## Phase 2: Teams and Team Members

**Source:** Team tab

**Structure:**
- Row 3 (index 2): team names across columns B–G
- Rows 4+: member names in the corresponding column

**Steps:**
1. Parse team names from row 3
2. For each member name in each column: fuzzy-match to `name → user_id` map
3. Upsert team records
4. Upsert `team_members` records (after resolving team UUIDs)
5. Captains/core: not determinable from raw text — set `is_captain = false`, `is_core = false` for all imports. Admin sets manually in admin panel.

---

## Phase 3: Weekly Strava Activities

**Source:** Each weekly tab (Jan26 through Mar09)

**Column mapping per weekly tab:**
| Column | Field |
|--------|-------|
| 0 | Athlete name |
| 1 | Time (minutes) |
| 2 | Activities count |
| 3 | Distance |
| 4 | Elevation gain |
| 5 | Strava URL |
| 6 | Strava ID |

**Steps:**
1. For each tab: resolve `week_start_date` from hardcoded map
2. Skip rows where time = 0 or blank
3. Fuzzy-match athlete name to `user_id`
4. Upsert into `strava_activities` with `source = 'manual_import'`
5. ON CONFLICT `(user_id, week_start_date, source)` DO UPDATE

**Week date map:**

| Tab | week_start_date |
|-----|----------------|
| Jan26 | 2026-01-26 |
| Feb02 | 2026-02-02 |
| Feb09 | 2026-02-09 |
| Feb16 | 2026-02-16 |
| Feb23 | 2026-02-23 |
| Mar02 | 2026-03-02 |
| Mar09 | 2026-03-09 |

---

## Phase 4: Streak Enrollments

**Source:** Streak Declarations tab

**Columns:** Timestamp | Name | Streak category | (week column) | Choice of level

**Steps:**
1. Sort by timestamp descending (latest declaration wins per user)
2. Fuzzy-match name to `user_id`
3. Normalise level: "Adv*" → Advanced, "Int*"/"Med*" → Intermediate, else → Beginner
4. Upsert ON CONFLICT `(user_id, season_id)` — one per person

---

## Phase 5: Streak Submissions

**Source:** Master Tracking — weekly streak columns (starting col W, index 22)

**Column detection:**
- Header row contains week labels (e.g. "Feb02") in streak columns
- Map header labels to `week_start_date` using the week date map

**Steps:**
1. For each data row: resolve `user_id`
2. For each streak column: read value
3. If value > 0: `completed = true`, `points_awarded = value`
4. If value = 0 or blank: `completed = false`, `points_awarded = 0`
5. Upsert ON CONFLICT `(user_id, season_id, week_start_date)` — bench_mode = false for all imports

---

## Phase 6: COTW Challenges and Submissions

**Source:** COTW Weekly Tracking tab

**Column positions (0-indexed):**
| Index | Field |
|-------|-------|
| 0 | Timestamp |
| 1 | Email address |
| 2 | Week of COTW (label) |
| 3 | Did COTW (free-text with score) |
| 4 | Time metric |
| 5 | NOTES: Strava |
| 6 | Participation Points |
| 7 | Winners Bonus |
| 8 | Total Score |
| 9 | Week Start Date |

**Steps:**
1. Collect unique week dates → upsert `cotw_challenges` records
   - Title: "COTW — Week of {date}" (admin updates descriptions in admin panel)
   - `participation_pts` from col 6
2. For each row: resolve `user_id` from email
3. Parse `participation` from col 3 free text:
   - Contains "nailed" or "yes" → `full_form`
   - Contains "assisted" → `assisted`
   - Else → `did_not_do`
4. Upsert `cotw_submissions` ON CONFLICT `(user_id, cotw_id)`

---

## Phase 7: Rebuild Score Cache

After all data is imported, calculate and write `score_cache` for every user:
1. Sum each point component from source tables
2. Sort all users by `total DESC`
3. Assign ranks
4. Print top 10 for validation

---

## Phase 8: Validation Report

Print summary to console:
- Count of rows in each table
- Top 5 leaderboard (name + total) — compare visually against the Google Sheet "Solo Leaderboard" tab

---

## Error Handling

All errors are logged to `migration_errors.csv` without halting the run.

| Error code | Meaning |
|-----------|---------|
| `MISSING_TEAM` | User's team field shows "Not Found" |
| `UNMATCHED_NAME` | Fuzzy match failed (score < 85%) |
| `UNMATCHED_EMAIL` | Email from COTW tab not found in users |
| `MISSING_STRAVA_ID` | No Strava ID found for a user row |
| `DB_WRITE_ERROR` | Supabase upsert failed |

Fuzzy match threshold: 85% (token_sort_ratio from fuzzywuzzy).

---

## Post-Import Checklist

- [ ] Review `migration_errors.csv` — resolve all MISSING_TEAM and UNMATCHED_NAME entries
- [ ] Assign team to Arun Vyas in admin panel (MISSING_TEAM flag)
- [ ] Cross-check top 5 leaderboard scores in portal against Google Sheet "Solo Leaderboard" tab
- [ ] Set `is_admin = true` for the coach's user record in Supabase
- [ ] Update COTW challenge titles and descriptions in admin panel (not in sheet)
- [ ] Set captains and core members in team builder (not determinable from import)
- [ ] Test Strava OAuth login with one user — verify they see their imported score
- [ ] Verify first Strava sync does not double-count manual_import weeks
