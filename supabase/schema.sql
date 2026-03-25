-- Almaden Fit AF — Full Database Schema
-- Compatible with PostgreSQL 15 (local) and Supabase
-- Run: psql $DATABASE_URL -f supabase/schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id               bigint UNIQUE NOT NULL,
  email                   text UNIQUE,
  name                    text NOT NULL,
  strava_url              text,
  photo_url               text,
  gender                  char(1) CHECK (gender IN ('M', 'F')),
  is_admin                boolean NOT NULL DEFAULT false,
  strava_access_token     text,
  strava_refresh_token    text,
  strava_token_expires_at timestamptz,
  last_synced_at          timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_strava_id ON users (strava_id);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);

-- ─── seasons ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  status       text NOT NULL CHECK (status IN ('active', 'archived', 'upcoming')) DEFAULT 'upcoming',
  track_config jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active ON seasons (status) WHERE status = 'active';

-- ─── teams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text NOT NULL DEFAULT 'E8500A',
  logo_url        text,
  captain_user_id uuid REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, name)
);

-- ─── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id  uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  is_captain boolean NOT NULL DEFAULT false,
  is_core    boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_season ON team_members (season_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

-- ─── strava_activities ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strava_activities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id          uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  strava_activity_id bigint,
  week_start_date    date NOT NULL,
  duration_minutes   integer NOT NULL DEFAULT 0,
  activity_count     integer DEFAULT 1,
  distance_km        numeric(8, 2),
  elevation_gain_m   numeric(8, 1),
  activity_type      text NOT NULL DEFAULT 'mixed',
  source             text NOT NULL CHECK (source IN ('strava_sync', 'manual_import')) DEFAULT 'strava_sync',
  flagged            boolean NOT NULL DEFAULT false,
  start_lat          numeric(9, 6),
  start_lng          numeric(9, 6),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_strava_activities_dedup_sync
  ON strava_activities (strava_activity_id) WHERE strava_activity_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_strava_activities_dedup_import
  ON strava_activities (user_id, week_start_date, source) WHERE source = 'manual_import';
CREATE INDEX IF NOT EXISTS idx_strava_activities_user_season ON strava_activities (user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_week ON strava_activities (week_start_date);
CREATE INDEX IF NOT EXISTS idx_strava_activities_flagged ON strava_activities (flagged) WHERE flagged = true;

-- ─── streak_enrollments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id   uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  track_name  text NOT NULL,
  level       text NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  declared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

-- ─── streak_submissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id       uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  completed       boolean NOT NULL DEFAULT false,
  points_awarded  integer NOT NULL DEFAULT 0,
  bench_mode      boolean NOT NULL DEFAULT false,
  source          text NOT NULL CHECK (source IN ('user', 'manual_import')) DEFAULT 'user',
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id, week_start_date)
);

-- ─── cotw_challenges ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotw_challenges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id         uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  week_start_date   date NOT NULL,
  title             text NOT NULL,
  description       text,
  video_url         text,
  scoring_rules     jsonb DEFAULT '{}',
  participation_pts integer NOT NULL DEFAULT 120,
  winner_bonus_pts  integer NOT NULL DEFAULT 0,
  voting_enabled    boolean NOT NULL DEFAULT false,
  voting_options    jsonb DEFAULT '[]',
  voting_deadline   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, week_start_date)
);

-- ─── cotw_submissions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotw_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cotw_id       uuid NOT NULL REFERENCES cotw_challenges (id) ON DELETE CASCADE,
  participation text NOT NULL CHECK (participation IN ('did_not_do', 'assisted', 'full_form')),
  score_text    text,
  strava_notes  text,
  proof_url     text,
  points_awarded integer NOT NULL DEFAULT 0,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL CHECK (source IN ('user', 'manual_import')) DEFAULT 'user',
  UNIQUE (user_id, cotw_id)
);

-- ─── cotw_winners ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotw_winners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotw_id     uuid NOT NULL REFERENCES cotw_challenges (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  gender      char(1) NOT NULL CHECK (gender IN ('M', 'F')),
  declared_at timestamptz NOT NULL DEFAULT now(),
  admin_id    uuid REFERENCES users (id),
  UNIQUE (cotw_id, gender)
);

-- ─── bonus_points ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  team_id         uuid REFERENCES teams (id),
  season_id       uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  points          integer NOT NULL,
  reason          text NOT NULL,
  awarded_by      uuid NOT NULL REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── score_cache ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_cache (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id       uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  strava_pts      integer NOT NULL DEFAULT 0,
  streak_pts      integer NOT NULL DEFAULT 0,
  cotw_pts        integer NOT NULL DEFAULT 0,
  bonus_pts       integer NOT NULL DEFAULT 0,
  total           integer NOT NULL DEFAULT 0,
  rank            integer,
  prev_rank       integer,
  last_calculated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_score_cache_leaderboard ON score_cache (season_id, total DESC);

-- ─── pulse_posts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id  uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'cotw_winner', 'coaches_corner', 'hot_streak', 'streak_complete',
    'cotw_submission', 'milestone', 'kudos_received', 'story',
    'announcement', 'rivalry_started'
  )),
  content    text NOT NULL,
  media_url  text,
  is_pinned  boolean NOT NULL DEFAULT false,
  reactions  jsonb NOT NULL DEFAULT '{}',
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_posts_feed ON pulse_posts (season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_pinned ON pulse_posts (is_pinned) WHERE is_pinned = true;

-- ─── kudos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kudos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message      text NOT NULL,
  season_id    uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── rivalries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rivalries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  opponent_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season_id      uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  status         text NOT NULL CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenger_id, opponent_id, season_id)
);

-- ─── hall_of_fame ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN (
    'cotw_weekly_champion_m', 'cotw_weekly_champion_f',
    'season_streak_champion', 'season_top_scorer_m', 'season_top_scorer_f',
    'season_team_champion', 'most_minutes'
  )),
  user_id         uuid REFERENCES users (id),
  team_id         uuid REFERENCES teams (id),
  value           text,
  week_start_date date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── nudges ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nudges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message      text NOT NULL,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── admin_audit_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES users (id),
  action       text NOT NULL,
  target_table text,
  target_id    uuid,
  old_value    jsonb,
  new_value    jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Views ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
  sc.rank,
  sc.prev_rank,
  sc.total,
  sc.strava_pts,
  sc.streak_pts,
  sc.cotw_pts,
  sc.bonus_pts,
  sc.last_calculated,
  sc.season_id,
  u.id          AS user_id,
  u.name,
  u.photo_url,
  u.gender,
  u.strava_url,
  t.id          AS team_id,
  t.name        AS team_name,
  t.color       AS team_color
FROM score_cache sc
JOIN users u ON u.id = sc.user_id
LEFT JOIN team_members tm ON tm.user_id = sc.user_id AND tm.season_id = sc.season_id
LEFT JOIN teams t ON t.id = tm.team_id
ORDER BY sc.rank ASC;

CREATE OR REPLACE VIEW v_team_leaderboard AS
SELECT
  t.id          AS team_id,
  t.name        AS team_name,
  t.color,
  sc.season_id,
  SUM(sc.total) AS total_pts,
  COUNT(sc.user_id) AS member_count,
  RANK() OVER (PARTITION BY sc.season_id ORDER BY SUM(sc.total) DESC) AS rank
FROM score_cache sc
JOIN team_members tm ON tm.user_id = sc.user_id AND tm.season_id = sc.season_id
JOIN teams t ON t.id = tm.team_id
GROUP BY t.id, t.name, t.color, sc.season_id;

-- ─── Seed: Season 7 ──────────────────────────────────────────────────────────

INSERT INTO seasons (name, start_date, end_date, status, track_config)
VALUES (
  'Season 7',
  '2026-01-26',
  '2026-06-30',
  'active',
  '[
    {"name":"Running","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Walking","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Strength/weight/resistance","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Yoga/Mobility","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Cycling","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Pushup/pullups","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]},
    {"name":"Rowing","levels":[{"label":"Beginner","points_per_week":50},{"label":"Intermediate","points_per_week":50},{"label":"Advanced","points_per_week":50}]}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Season 7 teams (inserted after season exists)
DO $$
DECLARE
  s7_id uuid;
BEGIN
  SELECT id INTO s7_id FROM seasons WHERE name = 'Season 7';
  IF s7_id IS NOT NULL THEN
    INSERT INTO teams (season_id, name, color) VALUES
      (s7_id, 'Udaan Pari',          'F5A623'),
      (s7_id, 'Sheetal Devi Arrows', '27AE60'),
      (s7_id, 'Messy Messies',       '8E44AD'),
      (s7_id, 'Dhoni Dhurandhars',   '2980B9'),
      (s7_id, 'Holy Kohli',          'E8500A'),
      (s7_id, 'Almaden Bolts',       'C0392B')
    ON CONFLICT (season_id, name) DO NOTHING;
  END IF;
END $$;
