# 11 — Admin Panel

## Overview

The admin panel is a separate section of the app at `/admin`. Accessible only to users with `is_admin = true`. The coach uses this panel to manage seasons, teams, COTWs, bonus points, activity flags, and whisper nudges.

---

## Admin Layout (`/admin/layout.tsx`)

- Verifies `is_admin` — redirects non-admins to `/dashboard`
- Different chrome from the portal: no Pulse feed, no Gemini widget
- Left sidebar with admin navigation
- Main area for the active admin page

### Admin Sidebar Nav

| Route | Label |
|-------|-------|
| `/admin` | 📊 Overview |
| `/admin/seasons` | 📅 Seasons |
| `/admin/teams` | 👥 Teams |
| `/admin/cotw` | ⚡ COTW |
| `/admin/bonuses` | 🎁 Bonuses |
| `/admin/activities` | 🚩 Flag Activities |
| `/admin/nudges` | 📬 Nudges |
| `/admin/import` | 📥 Import Status |

"← Back to Portal" link at the bottom of sidebar.

---

## Page: Admin Overview (`/admin`)

Quick stats for the active season:
- Total challengers
- Total teams
- Current week number
- Last Strava sync time
- "Force Sync" button → triggers `/api/cron/strava-sync` manually

---

## Page: Season Management (`/admin/seasons`)

### Season List

Table of all seasons with columns: Name, Start, End, Status, Actions.

Status badges:
- `active` → green pill "LIVE"
- `upcoming` → blue pill
- `archived` → gray pill

Actions per row:
- "Activate" button (for upcoming/archived seasons) — only if no other active season
- Activating a season deactivates the current one

### Create Season Form

Fields:
- Season name (text)
- Start date (date picker)
- End date (date picker)

"Create Season" button — on success the new season appears as `upcoming`.

After creating a season, the admin must configure the `track_config` (streak tracks). A JSON editor or a structured track builder UI is needed.

---

## Page: Team Builder (`/admin/teams`)

Two-panel layout for the active season.

### Left panel: Unassigned challengers

- List of all users in the season who have no team_members record
- Each row: avatar + name
- Dropdown next to each user: "Assign to…" → lists all 6 teams
- On selection: POST `/api/admin/teams/assign` with `{ user_id, team_id, season_id }`
- Row disappears from this panel and appears in the team panel

### Right panel: Teams with members

- One card per team, left border in team colour
- Shows team name + member count
- Lists all current members as small chips
- "Set Captain" button per member

---

## Page: COTW Management (`/admin/cotw`)

### Create Challenge Form

Fields:
- Week start date (date picker — must be a Monday)
- Challenge title (text)
- Challenge description (textarea)
- Demo video URL (text, optional)
- Participation points (number, default 120)
- Winner bonus points (number, default 0)
- Enable challenger voting? (toggle)
- If voting enabled: voting option 1, 2, 3 (text fields) + voting deadline

"Publish Challenge" button.

### Existing Challenges List

Dropdown to select which past/current challenge to manage.

### Winner Declaration UI

After selecting a challenge, two columns appear (Male / Female):

Each column shows all `full_form` submissions for that gender, sorted by submitted_at:
- Avatar + name
- Score text
- Strava notes
- "Crown 👑" button

Clicking "Crown" → POST `/api/admin/cotw/winner` → declares that user as the winner for that gender.

On declaration:
1. Insert into `cotw_winners`
2. Award `winner_bonus_pts` to the winner via `bonus_points` (if > 0)
3. Insert into `hall_of_fame` for `cotw_weekly_champion_m` or `f`
4. Call `triggerPulseEvent` with type `cotw_winner`
5. Call `recalculateUserScore` for the winner

---

## Page: Bonus Points (`/admin/bonuses`)

### Award Form

Toggle between "Individual" and "Team" bonus types.

**Individual fields:**
- Challenger dropdown (searchable by name)
- Points amount (number)
- Week (date picker — must be a Monday)
- Reason (textarea, required)

**Team fields:**
- Team dropdown
- Points amount (total; split equally across team members)
- Week
- Reason

"Award Bonus 🎁" button.

On submit:
1. Insert into `bonus_points`
2. Insert into `admin_audit_log`
3. Call `recalculateUserScore` (or all team member scores if team bonus)
4. Show toast confirmation

**Validation:** Check if a bonus already exists for this user/team + week. If so, warn the admin before saving (no hard block, just confirmation dialog).

### Audit Log Table

Scrollable table below the form showing all bonus_points records for the active season:

Columns: Date | Recipient | Reason | Points | Awarded by

---

## Page: Flag Activities (`/admin/activities`)

Used to exclude non-fitness Strava activities from scoring.

### Activity Search

Search by user name — shows their Strava activities for the season.

Columns: Date | Type | Duration | Distance | Flag status | Action

Action: "Flag" / "Unflag" toggle.

On flag/unflag:
1. UPDATE `strava_activities.flagged`
2. Insert into `admin_audit_log`
3. Call `recalculateUserScore`

---

## Page: Whisper Nudges (`/admin/nudges`)

Private one-to-one messages from coach to challengers. **Not** visible in The Pulse.

### Inactive Challengers Panel

Auto-populate with challengers who have had no Strava activity in the last 5+ days (based on `last_synced_at` or most recent activity date).

Each row:
- Avatar + name
- "Last seen: {date}" or "Never synced"
- Pre-filled message suggestion: "Hey {first name}, we miss you! 💪"
- Editable text input + "Send" button

On send:
1. INSERT into `nudges` table
2. Show "✓ Sent" confirmation on that row (disable re-send for 24h)

### Unread Badge

In the portal left sidebar, a notification badge on "Nudges" shows the count of unread nudges for the currently logged-in user (visible to challengers only).

---

## API Routes (Admin)

All require `requireAdmin()`.

| Method + Route | Action |
|----------------|--------|
| `POST /api/admin/seasons` | Create season |
| `POST /api/admin/seasons/{id}/activate` | Activate season (deactivates current) |
| `POST /api/admin/teams/assign` | Assign user to team |
| `POST /api/admin/cotw` | Create COTW challenge |
| `POST /api/admin/cotw/winner` | Declare winner + award bonus + HOF entry |
| `POST /api/admin/bonuses` | Award individual or team bonus |
| `POST /api/admin/activities/flag` | Flag/unflag Strava activity |
| `POST /api/admin/nudges` | Send whisper nudge |

---

## Admin Audit Log

Every admin action writes a row to `admin_audit_log`:

| Field | Value |
|-------|-------|
| `admin_id` | UUID of the admin performing the action |
| `action` | e.g. `'award_bonus'`, `'flag_activity'`, `'declare_winner'` |
| `target_table` | e.g. `'bonus_points'` |
| `target_id` | UUID of the affected record |
| `old_value` | Previous value as jsonb (for edits) |
| `new_value` | New value as jsonb |
