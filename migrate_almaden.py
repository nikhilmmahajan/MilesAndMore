"""
Almaden Fit AF — Google Sheet → Database Migration Script
==========================================================
Reads the live Season 7 Google Sheet ("Copy of Almaden Fit-7 : Tracking")
and populates the database via DATABASE_URL in .env.

Safe to re-run: all writes are UPSERT (idempotent).
Errors never halt the run — written to migration_errors.csv.

Prerequisites
-------------
pip install psycopg2-binary gspread pandas python-dotenv fuzzywuzzy python-Levenshtein

.env variables required:
  DATABASE_URL            — postgres connection string (Supabase pooler or local)
  GOOGLE_API_KEY          — Google API key (sheet must be "Anyone with link can view")
  GOOGLE_CREDENTIALS_PATH — (alternative) path to service-account JSON
  SPREADSHEET_ID          — Google Sheet key
  SEASON_7_ID             — UUID of the Season 7 row in the DB

Usage
-----
python migrate_almaden.py [--dry-run]
"""

import os
import sys
import csv
import json
import re
import argparse
from datetime import datetime, timezone
from typing import Optional

import gspread
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fuzzywuzzy import fuzz, process as fuzz_process

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DATABASE_URL      = os.environ["DATABASE_URL"]
SPREADSHEET_ID    = os.environ["SPREADSHEET_ID"]
SEASON_7_ID       = os.environ["SEASON_7_ID"]
GOOGLE_API_KEY    = os.environ.get("GOOGLE_API_KEY", "").strip()
GOOGLE_CREDS_PATH = os.environ.get("GOOGLE_CREDENTIALS_PATH", "").strip()

# Weekly activity tabs present in the sheet (add new ones as season progresses)
WEEKLY_TABS = [
    "Jan26", "Feb02", "Feb09", "Feb16", "Feb23",
    "Mar02", "Mar09", "Mar16",
]

# Maps week-label (as seen in sheet headers/cells) → ISO Monday date
WEEK_DATE_MAP: dict[str, str] = {
    "Jan26": "2026-01-26",
    "Feb02": "2026-02-02",
    "Feb09": "2026-02-09",
    "Feb16": "2026-02-16",
    "Feb23": "2026-02-23",
    "Mar02": "2026-03-02",
    "Mar09": "2026-03-09",
    "Mar16": "2026-03-16",
    "Mar23": "2026-03-23",
    "Mar30": "2026-03-30",
    "Apr06": "2026-04-06",
    "Apr13": "2026-04-13",
}

FUZZY_THRESHOLD = 85

# ─── ERROR COLLECTOR ─────────────────────────────────────────────────────────

errors: list[dict] = []

def log_error(code: str, context: str, detail: str):
    errors.append({"code": code, "context": context, "detail": detail})
    print(f"  ⚠ [{code}] {context}: {detail}")

def write_errors():
    if not errors:
        print("\n✅ No errors recorded.")
        return
    path = "migration_errors.csv"
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["code", "context", "detail"])
        w.writeheader()
        w.writerows(errors)
    print(f"\n⚠ {len(errors)} error(s) written to {path}")

# ─── DATABASE ─────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(DATABASE_URL)

def db_fetch(conn, sql: str, params=None) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or [])
        return [dict(r) for r in cur.fetchall()]

def upsert(conn, table: str, records: list[dict], on_conflict: str, dry_run=False):
    """Batch UPSERT: INSERT ... ON CONFLICT (...) DO UPDATE SET ..."""
    if not records:
        return
    if dry_run:
        print(f"  [DRY RUN] Would upsert {len(records)} rows into {table}")
        return

    cols          = list(records[0].keys())
    conflict_cols = [c.strip() for c in on_conflict.split(",")]
    update_cols   = [c for c in cols if c not in conflict_cols]

    col_list   = ", ".join(f'"{c}"' for c in cols)
    val_list   = ", ".join(f"%({c})s" for c in cols)
    conflict   = ", ".join(f'"{c}"' for c in conflict_cols)
    update_set = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in update_cols)

    sql = (
        f'INSERT INTO "{table}" ({col_list}) VALUES ({val_list}) '
        + (f"ON CONFLICT ({conflict}) DO UPDATE SET {update_set}"
           if update_set else f"ON CONFLICT ({conflict}) DO NOTHING")
    )

    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, records, page_size=200)
        conn.commit()
        print(f"  ✅ Upserted {len(records)} rows → {table}")
    except Exception as e:
        conn.rollback()
        log_error("DB_WRITE_ERROR", table, str(e))

# ─── GOOGLE SHEETS ────────────────────────────────────────────────────────────

def open_sheet() -> gspread.Spreadsheet:
    if GOOGLE_CREDS_PATH and os.path.exists(GOOGLE_CREDS_PATH):
        gc = gspread.service_account(filename=GOOGLE_CREDS_PATH)
        print("  Auth: service account")
    elif GOOGLE_API_KEY:
        gc = gspread.api_key(GOOGLE_API_KEY)
        print("  Auth: API key")
    else:
        raise RuntimeError("Set GOOGLE_API_KEY or GOOGLE_CREDENTIALS_PATH in .env")
    sh = gc.open_by_key(SPREADSHEET_ID)
    print(f"✅ Opened sheet: {sh.title}")
    return sh

def tab_raw(sh: gspread.Spreadsheet, name: str) -> list[list[str]]:
    return sh.worksheet(name).get_all_values()

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def clean_str(val) -> Optional[str]:
    v = str(val).strip() if val is not None else ""
    return v if v and v.lower() not in ("none", "#n/a", "n/a", "—", "-") else None

def clean_int(val) -> Optional[int]:
    v = clean_str(val)
    if v is None:
        return None
    v = re.sub(r"[^\d\-]", "", v)
    try:
        return int(v)
    except ValueError:
        return None

def extract_strava_id(url_or_id) -> Optional[int]:
    v = clean_str(url_or_id)
    if v is None:
        return None
    m = re.search(r"athletes?/(\d+)", v)
    if m:
        return int(m.group(1))
    try:
        return int(re.sub(r"[^\d]", "", v)) or None
    except ValueError:
        return None

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def fuzzy_match(name: str, name_map: dict[str, str]) -> Optional[str]:
    if not name_map:
        return None
    match, score = fuzz_process.extractOne(name, list(name_map.keys()), scorer=fuzz.token_sort_ratio)
    return name_map[match] if score >= FUZZY_THRESHOLD else None

def resolve_week_label(raw: str) -> Optional[str]:
    """
    Convert any week label/string to a WEEK_DATE_MAP key (e.g. 'Feb09').
    Handles: 'Feb09', 'Feb09-Feb15', 'Mar02-Mar08-(5K-RUN)', 'Feb02-Feb08', etc.
    """
    v = clean_str(raw)
    if not v:
        return None
    # Direct match first
    if v in WEEK_DATE_MAP:
        return v
    # Match any 5-char prefix like 'Feb09' or 'Mar02'
    for key in WEEK_DATE_MAP:
        if v.startswith(key) or v.lower().startswith(key.lower()):
            return key
    return None

def week_iso(label: str) -> Optional[str]:
    key = resolve_week_label(label)
    return WEEK_DATE_MAP.get(key) if key else None

def parse_cotw_participation(raw: Optional[str]) -> str:
    r = (raw or "").lower()
    if "nailed" in r or ("yes" in r and "assist" not in r):
        return "full_form"
    if "assist" in r:
        return "assisted"
    return "did_not_do"

# ─── PHASE 1: USERS ──────────────────────────────────────────────────────────
# Source: "Master Tracking" tab — header on row 2 (index 1), data from row 3+
# Columns: Email | Name | Strava URL | Strava ID | Gender | ... | Team Name

def import_users(sh, conn, dry_run=False) -> tuple[dict, dict]:
    print("\n── Phase 1: Users ──────────────────────────────────────")
    raw = tab_raw(sh, "Master Tracking")

    # Find the header row — scan for 'email' in col 0
    hdr_idx = next(
        (i for i, r in enumerate(raw) if r and r[0].strip().lower() == "email"),
        None
    )
    if hdr_idx is None:
        log_error("PARSE_ERROR", "Master Tracking", "Cannot find header row (col A == 'Email')")
        return {}, {}

    data_rows = raw[hdr_idx + 1:]
    print(f"  Header at row {hdr_idx+1}, {len(data_rows)} data rows")

    records: list[dict] = []
    for i, r in enumerate(data_rows):
        # Columns: 0=Email 1=Name 2=StravaURL 3=StravaID 4=Gender 5=BaseScore
        #          6=StreakTotal 7=COTWTotal 8=TotalScore 9=TeamName
        if len(r) < 5:
            continue

        name       = clean_str(r[1])
        if not name:
            continue

        email      = clean_str(r[0])
        strava_url = clean_str(r[2])
        strava_id  = extract_strava_id(r[3]) or extract_strava_id(strava_url)
        gender     = clean_str(r[4])
        team_name  = clean_str(r[9]) if len(r) > 9 else None

        if not strava_id:
            log_error("MISSING_STRAVA_ID", f"Row {hdr_idx+i+2}", f"Name={name}")
        if team_name and "not found" in team_name.lower():
            log_error("MISSING_TEAM", name, f"Team field='{team_name}'")
        if gender and gender.upper() not in ("M", "F"):
            gender = None

        records.append({
            "strava_id":  strava_id,
            "email":      email.lower() if email else None,
            "name":       name,
            "strava_url": strava_url,
            "gender":     gender.upper() if gender else None,
            "is_admin":   False,
            "created_at": now_iso(),
        })

    upsert(conn, "users", records, "strava_id", dry_run)

    name_map: dict[str, str]     = {}
    email_map: dict[str, str]    = {}
    strava_id_map: dict[int, str] = {}  # strava_id (int) → user_id

    if not dry_run:
        for u in db_fetch(conn, "SELECT id, name, email, strava_id FROM users"):
            uid = str(u["id"])
            if u["name"]:
                name_map[u["name"]] = uid
            if u["email"]:
                email_map[u["email"]] = uid
            if u["strava_id"]:
                strava_id_map[int(u["strava_id"])] = uid
    else:
        for rec in records:
            uid = f"DRY-{rec['strava_id']}"
            name_map[rec["name"]] = uid
            if rec["email"]:
                email_map[rec["email"]] = uid
            if rec["strava_id"]:
                strava_id_map[int(rec["strava_id"])] = uid

    print(f"  ✅ {len(records)} users processed, {len(name_map)} in name map")
    return name_map, email_map, strava_id_map

# ─── PHASE 2: TEAMS ──────────────────────────────────────────────────────────
# Source: "Team" tab
# Row 1: WhatsApp link header
# Row 2: Team names (cols B–G = indices 1–6)
# Row 3+: Member names per column

def import_teams(sh, conn, name_map, strava_id_map, dry_run=False) -> dict[str, str]:
    print("\n── Phase 2: Teams ──────────────────────────────────────")
    raw = tab_raw(sh, "Team")

    team_colors = {
        "Udaan Pari":          "F5A623",
        "Sheetal Devi Arrows": "27AE60",
        "Messy Messies":       "8E44AD",
        "Dhoni Dhurandhars":   "2980B9",
        "Holy Kohli":          "E8500A",
        "Almaden Bolts":       "C0392B",
    }

    # Labels that appear as section headings in the Team tab — not real member names
    TEAM_LABEL_ROWS = {"team captains", "core team", "captain", "core"}

    # Row index 1 = team names row (0-indexed)
    team_name_row = raw[1] if len(raw) > 1 else []
    team_col_map: dict[int, str] = {}
    for col in range(1, 7):
        t = clean_str(team_name_row[col]) if col < len(team_name_row) else None
        if t:
            team_col_map[col] = t

    print(f"  Teams: {list(team_col_map.values())}")

    team_members: dict[str, list[str]] = {t: [] for t in team_col_map.values()}
    for row in raw[2:]:
        for col, tname in team_col_map.items():
            m = clean_str(row[col]) if col < len(row) else None
            if m and m.lower() not in TEAM_LABEL_ROWS:
                team_members[tname].append(m)

    team_records = [
        {"season_id": SEASON_7_ID, "name": t, "color": team_colors.get(t, "888888")}
        for t in team_col_map.values()
    ]
    upsert(conn, "teams", team_records, "season_id,name", dry_run)

    team_id_map: dict[str, str] = {}
    if not dry_run:
        for t in db_fetch(conn, "SELECT id, name FROM teams WHERE season_id = %s", (SEASON_7_ID,)):
            team_id_map[t["name"]] = str(t["id"])
    else:
        for t in team_records:
            team_id_map[t["name"]] = f"DRY-{t['name'][:6]}"

    tm_records: list[dict] = []
    for tname, members in team_members.items():
        tid = team_id_map.get(tname)
        if not tid:
            log_error("MISSING_TEAM_ID", tname, "team_id not resolved")
            continue
        for mname in members:
            uid = name_map.get(mname) or fuzzy_match(mname, name_map)
            if not uid:
                log_error("UNMATCHED_NAME", f"Team={tname}", f"'{mname}'")
                continue
            tm_records.append({
                "team_id": tid, "user_id": uid,
                "season_id": SEASON_7_ID,
                "is_captain": False, "is_core": False,
            })

    upsert(conn, "team_members", tm_records, "team_id,user_id,season_id", dry_run)
    print(f"  ✅ {len(team_col_map)} teams, {len(tm_records)} memberships")
    return team_id_map

# ─── PHASE 3: WEEKLY STRAVA ACTIVITIES ───────────────────────────────────────
# Source: One tab per week (Jan26, Feb02, ..., Mar16)
# Columns: Athlete | Time(mins) | Activities | Distance | Elev. Gain | Strava URL | Strava ID

def import_weekly_activities(sh, conn, name_map, strava_id_map, dry_run=False):
    print("\n── Phase 3: Weekly Strava Activities ───────────────────")
    total = 0

    for tab in WEEKLY_TABS:
        iso_date = WEEK_DATE_MAP.get(tab)
        if not iso_date:
            log_error("CONFIG", tab, "No ISO date in WEEK_DATE_MAP")
            continue

        try:
            ws = sh.worksheet(tab)
        except gspread.exceptions.WorksheetNotFound:
            print(f"  ⚠ Tab '{tab}' not found — skipping")
            continue

        raw = ws.get_all_values()
        if not raw:
            continue

        # Find "Athlete" header row
        hdr_idx = next(
            (i for i, r in enumerate(raw) if r and r[0].strip().lower() == "athlete"),
            None
        )
        if hdr_idx is None:
            log_error("PARSE_ERROR", tab, "Header 'Athlete' not found")
            continue

        records: list[dict] = []
        for r in raw[hdr_idx + 1:]:
            name = clean_str(r[0]) if r else None
            if not name:
                continue

            mins = clean_int(r[1]) if len(r) > 1 else None
            if not mins or mins == 0:
                continue

            # Resolve user: prefer Strava ID (col 6) → name map → fuzzy
            raw_sid = extract_strava_id(r[6]) if len(r) > 6 else None
            raw_sid = raw_sid or (extract_strava_id(r[5]) if len(r) > 5 else None)
            uid = (
                strava_id_map.get(raw_sid)
                or name_map.get(name)
                or fuzzy_match(name, name_map)
            )
            if not uid:
                log_error("UNMATCHED_NAME", tab, f"'{name}' (Strava ID={raw_sid})")
                continue

            act_count = clean_int(r[2]) if len(r) > 2 else None

            def to_float(v):
                s = clean_str(v)
                if not s or s in ("--", "—"):
                    return None
                try:
                    return float(re.sub(r"[^\d.\-]", "", s))
                except ValueError:
                    return None

            records.append({
                "user_id":            uid,
                "season_id":          SEASON_7_ID,
                "strava_activity_id": None,
                "week_start_date":    iso_date,
                "duration_minutes":   mins,
                "activity_count":     act_count,
                "distance_km":        to_float(r[3]) if len(r) > 3 else None,
                "elevation_gain_m":   to_float(r[4]) if len(r) > 4 else None,
                "activity_type":      "mixed",
                "source":             "manual_import",
                "flagged":            False,
                "created_at":         now_iso(),
            })

        upsert(conn, "strava_activities", records, "user_id,week_start_date,source", dry_run)
        total += len(records)
        print(f"    {tab}: {len(records)} rows")

    print(f"  ✅ {total} activity records across {len(WEEKLY_TABS)} weeks")

# ─── PHASE 4: STREAK ENROLLMENTS ─────────────────────────────────────────────
# Source: "Streak Declarations" tab (Google Form responses)
# Columns: Timestamp | Name | Streak category | (week) | Choice of level | ...
# Take the latest declaration per user.

def import_streak_enrollments(sh, conn, name_map, dry_run=False):
    print("\n── Phase 4: Streak Enrollments ─────────────────────────")

    try:
        raw = tab_raw(sh, "Streak Declarations")
    except gspread.exceptions.WorksheetNotFound:
        print("  ⚠ 'Streak Declarations' tab not found — skipping")
        return

    # Col: 0=Timestamp 1=Name 2=StreakCategory 3=WeekLastFinished 4=ChoiceOfLevel
    records: list[dict] = []
    seen: set[str] = set()

    # Sort descending by timestamp so latest wins (skip blanks)
    data_rows = [r for r in raw[1:] if any(c.strip() for c in r)]
    data_rows.sort(key=lambda r: r[0] if r else "", reverse=True)

    for r in data_rows:
        name  = clean_str(r[1]) if len(r) > 1 else None
        track = clean_str(r[2]) if len(r) > 2 else None
        level = clean_str(r[4]) if len(r) > 4 else None
        ts    = clean_str(r[0]) if len(r) > 0 else None

        if not name or not track:
            continue

        uid = name_map.get(name) or fuzzy_match(name, name_map)
        if not uid:
            log_error("UNMATCHED_NAME", "Streak Declarations", f"'{name}'")
            continue
        if uid in seen:
            continue
        seen.add(uid)

        lv = (level or "").lower()
        if "adv" in lv:
            level_norm = "Advanced"
        elif "int" in lv or "med" in lv:
            level_norm = "Intermediate"
        else:
            level_norm = "Beginner"

        records.append({
            "user_id":    uid,
            "season_id":  SEASON_7_ID,
            "track_name": track,
            "level":      level_norm,
            "declared_at": ts or now_iso(),
        })

    upsert(conn, "streak_enrollments", records, "user_id,season_id", dry_run)
    print(f"  ✅ {len(records)} streak enrollments")

# ─── PHASE 5: STREAK SUBMISSIONS ─────────────────────────────────────────────
# Source: "Streaks Weekly Tracking" tab (Google Form responses, 689 rows)
# Each row = one person's weekly streak submission.
#
# Header: Timestamp | Name | Streak category | "I did..." | Column4 |
#         Week of Streak | Email Address | Strava ID | Week start Date |
#         Feb02 | Feb09 | Feb16 | Feb23 | Mar02 | Mar09 | Mar16 | ...
#
# Col 8 = "Week start Date" (label like "Feb02") — identifies which week this row is for.
# The matching weekly column (col 9+) contains the points awarded (50 = done, 0 = not).

def import_streak_submissions(sh, conn, name_map, email_map, strava_id_map, dry_run=False):
    print("\n── Phase 5: Streak Submissions ─────────────────────────")

    try:
        raw = tab_raw(sh, "Streaks Weekly Tracking")
    except gspread.exceptions.WorksheetNotFound:
        print("  ⚠ 'Streaks Weekly Tracking' tab not found — skipping")
        return

    if not raw:
        return

    header = raw[0]
    # Build map: week_label → column index (for cols 9+)
    week_col_idx: dict[str, int] = {}
    for ci, h in enumerate(header):
        h = h.strip()
        if h in WEEK_DATE_MAP:
            week_col_idx[h] = ci

    records: list[dict] = []
    seen: set[tuple] = set()  # (user_id, week_iso) to deduplicate

    for row in raw[1:]:
        if not any(c.strip() for c in row):
            continue

        # Col 6 = Email, Col 1 = Name (for fallback), Col 7 = Strava ID
        email = clean_str(row[6]).lower() if len(row) > 6 and clean_str(row[6]) else None
        name  = clean_str(row[1]) if len(row) > 1 else None

        # Silently skip blank-user rows (sheet has many trailing empty rows)
        if not email and not name:
            continue

        raw_sid = extract_strava_id(row[7]) if len(row) > 7 else None
        uid = (
            (strava_id_map.get(raw_sid) if raw_sid else None)
            or email_map.get(email)
            or (name_map.get(name) if name else None)
            or (fuzzy_match(name, name_map) if name else None)
        )
        if not uid:
            log_error("UNMATCHED_USER", "Streaks Weekly Tracking",
                      f"Email={email}, Name={name}")
            continue

        # Col 8 = week label ("Feb02", "Mar09", etc.)
        week_label = clean_str(row[8]) if len(row) > 8 else None
        iso_date   = week_iso(week_label) if week_label else None
        if not iso_date:
            log_error("BAD_WEEK", "Streaks Weekly Tracking",
                      f"Week label='{week_label}' for {name}")
            continue

        key = (uid, iso_date)
        if key in seen:
            continue
        seen.add(key)

        # Find points from the matching week column
        col_i = week_col_idx.get(week_label)
        pts   = clean_int(row[col_i]) if col_i is not None and col_i < len(row) else None
        if pts is None:
            # Fallback: treat "Nailed it" as 50
            did_text = clean_str(row[3]) if len(row) > 3 else ""
            pts = 50 if did_text and "nailed" in did_text.lower() else 0

        records.append({
            "user_id":         uid,
            "season_id":       SEASON_7_ID,
            "week_start_date": iso_date,
            "completed":       pts > 0,
            "points_awarded":  pts,
            "bench_mode":      False,
            "source":          "manual_import",
        })

    upsert(conn, "streak_submissions", records, "user_id,season_id,week_start_date", dry_run)
    print(f"  ✅ {len(records)} streak submission records")

# ─── PHASE 6: COTW ───────────────────────────────────────────────────────────
# Source: "COTW Weekly Tracking" tab (Google Form responses, 403 rows)
# Header: Timestamp | Email Address | Week of COTW | I did COTW |
#         Miles covered | Strava Link | NOTES | Participation Points |
#         Winners Bonus | Total Score
#
# "Week of COTW" values: "Feb09-Feb15", "Mar02-Mar08-(5K-RUN)", etc.
# Resolve via resolve_week_label() which strips the suffix.

def import_cotw(sh, conn, email_map, dry_run=False) -> dict[str, str]:
    print("\n── Phase 6: COTW Challenges & Submissions ───────────────")

    try:
        raw = tab_raw(sh, "COTW Weekly Tracking")
    except gspread.exceptions.WorksheetNotFound:
        print("  ⚠ 'COTW Weekly Tracking' tab not found — skipping")
        return {}

    # Col indices
    CI_TS    = 0; CI_EMAIL = 1; CI_WEEK  = 2; CI_DID   = 3
    CI_MILES = 4; CI_LINK  = 5; CI_NOTES = 6
    CI_PPTS  = 7; CI_WBONUS = 8; CI_TOTAL = 9

    def get(row, ci):
        return row[ci] if ci < len(row) else ""

    # Collect unique weeks for cotw_challenges
    week_ppts:  dict[str, int] = {}
    week_wbonus: dict[str, int] = {}

    for row in raw[1:]:
        wlabel = resolve_week_label(get(row, CI_WEEK))
        if not wlabel:
            continue
        iso = WEEK_DATE_MAP[wlabel]
        if iso not in week_ppts:
            week_ppts[iso]  = clean_int(get(row, CI_PPTS))  or 0
            week_wbonus[iso] = clean_int(get(row, CI_WBONUS)) or 0

    # COTW challenge title — include the event name from the week label
    def cotw_title(week_raw: str, iso: str) -> str:
        extra = re.sub(r"^[A-Za-z]{3}\d{2}-[A-Za-z]{3}\d{2}", "", week_raw).strip("-()")
        return f"COTW — {iso}" + (f" ({extra})" if extra else "")

    challenge_records = [
        {
            "season_id":         SEASON_7_ID,
            "week_start_date":   iso,
            "title":             f"COTW — {iso}",
            "description":       "",
            "participation_pts": ppts,
            "winner_bonus_pts":  week_wbonus.get(iso, 0),
            "scoring_rules":     json.dumps({"source": "manual_import"}),
        }
        for iso, ppts in week_ppts.items()
    ]
    upsert(conn, "cotw_challenges", challenge_records, "season_id,week_start_date", dry_run)

    cotw_id_map: dict[str, str] = {}
    if not dry_run:
        for c in db_fetch(conn,
                          "SELECT id, week_start_date FROM cotw_challenges WHERE season_id = %s",
                          (SEASON_7_ID,)):
            cotw_id_map[str(c["week_start_date"])] = str(c["id"])
    else:
        for rec in challenge_records:
            cotw_id_map[rec["week_start_date"]] = f"DRY-COTW-{rec['week_start_date']}"

    # Submission records
    sub_records: list[dict] = []
    seen: set[tuple] = set()  # (user_id, cotw_id)

    for row in raw[1:]:
        email = clean_str(get(row, CI_EMAIL))
        if email:
            email = email.lower()

        wlabel  = resolve_week_label(get(row, CI_WEEK))
        iso     = WEEK_DATE_MAP.get(wlabel) if wlabel else None
        cotw_id = cotw_id_map.get(iso) if iso else None

        if not email or not cotw_id:
            continue

        uid = email_map.get(email)
        if not uid:
            log_error("UNMATCHED_EMAIL", "COTW Tracking", f"'{email}'")
            continue

        key = (uid, cotw_id)
        if key in seen:
            continue
        seen.add(key)

        did_raw = clean_str(get(row, CI_DID))
        total   = clean_int(get(row, CI_TOTAL)) or 0

        sub_records.append({
            "user_id":        uid,
            "cotw_id":        cotw_id,
            "participation":  parse_cotw_participation(did_raw),
            "score_text":     did_raw,
            "strava_notes":   clean_str(get(row, CI_NOTES)) or clean_str(get(row, CI_LINK)),
            "points_awarded": total,
            "submitted_at":   clean_str(get(row, CI_TS)) or now_iso(),
            "source":         "manual_import",
        })

    upsert(conn, "cotw_submissions", sub_records, "user_id,cotw_id", dry_run)
    print(f"  ✅ {len(challenge_records)} COTW challenges, {len(sub_records)} submissions")
    return cotw_id_map

# ─── PHASE 7: REBUILD SCORE CACHE ────────────────────────────────────────────

def rebuild_score_cache(conn, dry_run=False):
    print("\n── Phase 7: Rebuild Score Cache ────────────────────────")

    if dry_run:
        print("  [DRY RUN] Would recalculate score_cache.")
        return

    agg = db_fetch(conn, """
        SELECT
            u.id::text                        AS user_id,
            COALESCE(act.strava_pts,  0)::int AS strava_pts,
            COALESCE(str.streak_pts,  0)::int AS streak_pts,
            COALESCE(cotw.cotw_pts,   0)::int AS cotw_pts,
            COALESCE(bon.bonus_pts,   0)::int AS bonus_pts
        FROM users u
        JOIN team_members tm ON tm.user_id = u.id AND tm.season_id = %s
        LEFT JOIN (
            SELECT user_id, SUM(duration_minutes)::int AS strava_pts
            FROM strava_activities
            WHERE season_id = %s AND flagged = false
            GROUP BY user_id
        ) act ON act.user_id = u.id
        LEFT JOIN (
            SELECT user_id, SUM(points_awarded)::int AS streak_pts
            FROM streak_submissions
            WHERE season_id = %s
            GROUP BY user_id
        ) str ON str.user_id = u.id
        LEFT JOIN (
            SELECT cs.user_id, SUM(cs.points_awarded)::int AS cotw_pts
            FROM cotw_submissions cs
            JOIN cotw_challenges cc ON cc.id = cs.cotw_id AND cc.season_id = %s
            GROUP BY cs.user_id
        ) cotw ON cotw.user_id = u.id
        LEFT JOIN (
            SELECT user_id, SUM(points)::int AS bonus_pts
            FROM bonus_points WHERE season_id = %s
            GROUP BY user_id
        ) bon ON bon.user_id = u.id
    """, (SEASON_7_ID,) * 5)

    cache = []
    for r in agg:
        total = r["strava_pts"] + r["streak_pts"] + r["cotw_pts"] + r["bonus_pts"]
        cache.append({**r, "total": total, "rank": 0,
                      "season_id": SEASON_7_ID, "last_calculated": now_iso()})

    cache.sort(key=lambda x: x["total"], reverse=True)
    for i, rec in enumerate(cache):
        rec["rank"] = i + 1

    upsert(conn, "score_cache", cache, "user_id,season_id", dry_run)
    print(f"  ✅ Score cache rebuilt for {len(cache)} users")

    print(f"\n  {'Rank':<5} {'Total':>6}  Name")
    for rec in cache[:10]:
        uid = rec["user_id"]
        print(f"  #{rec['rank']:<4} {rec['total']:>6}  {uid}")

# ─── PHASE 8: VALIDATION ─────────────────────────────────────────────────────

def validation_report(conn, dry_run=False):
    print("\n── Phase 8: Validation Report ──────────────────────────")
    if dry_run:
        print("  [DRY RUN] Skipping.")
        return

    def count(table, where="", params=()):
        sql = f'SELECT COUNT(*) AS n FROM "{table}"'
        if where:
            sql += f" WHERE {where}"
        return db_fetch(conn, sql, params)[0]["n"]

    s = SEASON_7_ID
    print(f"  users:              {count('users')}")
    print(f"  teams:              {count('teams', 'season_id=%s', (s,))}")
    print(f"  team_members:       {count('team_members', 'season_id=%s', (s,))}")
    print(f"  strava_activities:  {count('strava_activities', 'season_id=%s', (s,))}")
    print(f"  streak_enrollments: {count('streak_enrollments', 'season_id=%s', (s,))}")
    print(f"  streak_submissions: {count('streak_submissions', 'season_id=%s', (s,))}")
    print(f"  cotw_challenges:    {count('cotw_challenges', 'season_id=%s', (s,))}")
    print(f"  cotw_submissions:   {count('cotw_submissions')}")
    print(f"  score_cache:        {count('score_cache', 'season_id=%s', (s,))}")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Almaden Fit AF — Sheet → DB")
    parser.add_argument("--dry-run", action="store_true")
    args   = parser.parse_args()
    dry    = args.dry_run

    print("🔵 DRY RUN — no writes\n" if dry else "🟠 LIVE MODE — writing to DB\n")
    print(f"Sheet      : {SPREADSHEET_ID}")
    print(f"Season 7   : {SEASON_7_ID}\n")

    sh   = open_sheet()
    conn = get_conn() if not dry else None

    name_map, email_map, strava_id_map = import_users(sh, conn, dry)
    import_teams(sh, conn, name_map, strava_id_map, dry)
    import_weekly_activities(sh, conn, name_map, strava_id_map, dry)
    import_streak_enrollments(sh, conn, name_map, dry)
    import_streak_submissions(sh, conn, name_map, email_map, strava_id_map, dry)
    import_cotw(sh, conn, email_map, dry)
    rebuild_score_cache(conn, dry)
    validation_report(conn, dry)

    if conn:
        conn.close()

    write_errors()

    print("\n" + "═" * 56)
    print("  Migration complete.")
    print("  Next steps:")
    print("  1. Check migration_errors.csv for any unmatched names")
    print("  2. Cross-check top 5 scores vs your Google Sheet")
    print("  3. Mark yourself as admin in Supabase (is_admin=true)")
    print("  4. Update COTW challenge titles in the admin UI")
    print("═" * 56)

if __name__ == "__main__":
    main()
