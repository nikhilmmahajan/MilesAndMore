export interface User {
  id: string
  strava_id: string
  email: string | null
  name: string
  strava_url: string | null
  photo_url: string | null
  gender: 'M' | 'F' | null
  is_admin: boolean
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_token_expires_at: string | null
  last_synced_at: string | null
  created_at: string
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'active' | 'archived' | 'upcoming'
  track_config: TrackConfig[]
  created_at: string
}

export interface TrackConfig {
  name: string
  levels: { label: string; points_per_week: number }[]
}

export interface Team {
  id: string
  season_id: string
  name: string
  color: string
  logo_url: string | null
  captain_user_id: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  season_id: string
  is_captain: boolean
  is_core: boolean
}

export interface StravaActivity {
  id: string
  user_id: string
  season_id: string
  strava_activity_id: string | null
  week_start_date: string
  duration_minutes: number
  activity_count: number
  distance_km: number | null
  elevation_gain_m: number | null
  activity_type: string
  source: 'strava_sync' | 'manual_import'
  flagged: boolean
  start_lat: number | null
  start_lng: number | null
  created_at: string
}

export interface StreakEnrollment {
  id: string
  user_id: string
  season_id: string
  track_name: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  declared_at: string
}

export interface StreakSubmission {
  id: string
  user_id: string
  season_id: string
  week_start_date: string
  completed: boolean
  points_awarded: number
  bench_mode: boolean
  source: 'user' | 'manual_import'
  submitted_at: string
}

export interface CotwChallenge {
  id: string
  season_id: string
  week_start_date: string
  title: string
  description: string | null
  video_url: string | null
  scoring_rules: Record<string, unknown>
  participation_pts: number
  winner_bonus_pts: number
  voting_enabled: boolean
  voting_options: VotingOption[]
  voting_deadline: string | null
  created_at: string
}

export interface VotingOption {
  label: string
  votes: number
}

export interface CotwSubmission {
  id: string
  user_id: string
  cotw_id: string
  participation: 'did_not_do' | 'assisted' | 'full_form'
  score_text: string | null
  strava_notes: string | null
  proof_url: string | null
  points_awarded: number
  submitted_at: string
  source: 'user' | 'manual_import'
}

export interface CotwWinner {
  id: string
  cotw_id: string
  user_id: string
  gender: 'M' | 'F'
  declared_at: string
  admin_id: string | null
}

export interface BonusPoint {
  id: string
  user_id: string
  team_id: string | null
  season_id: string
  week_start_date: string
  points: number
  reason: string
  awarded_by: string
  created_at: string
}

export interface ScoreCache {
  id: string
  user_id: string
  season_id: string
  strava_pts: number
  streak_pts: number
  cotw_pts: number
  bonus_pts: number
  total: number
  rank: number | null
  prev_rank: number | null
  last_calculated: string
}

export interface PulsePost {
  id: string
  user_id: string
  season_id: string
  event_type: PulseEventType
  content: string
  media_url: string | null
  is_pinned: boolean
  reactions: Record<string, number>
  metadata: Record<string, unknown>
  created_at: string
}

export type PulseEventType =
  | 'cotw_winner'
  | 'coaches_corner'
  | 'hot_streak'
  | 'streak_complete'
  | 'cotw_submission'
  | 'milestone'
  | 'kudos_received'
  | 'story'
  | 'announcement'
  | 'rivalry_started'

export interface Kudos {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  season_id: string
  created_at: string
}

export interface Rivalry {
  id: string
  challenger_id: string
  opponent_id: string
  season_id: string
  status: 'active' | 'resolved'
  created_at: string
}

export interface HallOfFameEntry {
  id: string
  season_id: string
  category: HofCategory
  user_id: string | null
  team_id: string | null
  value: string | null
  week_start_date: string | null
  created_at: string
}

export type HofCategory =
  | 'cotw_weekly_champion_m'
  | 'cotw_weekly_champion_f'
  | 'season_streak_champion'
  | 'season_top_scorer_m'
  | 'season_top_scorer_f'
  | 'season_team_champion'
  | 'most_minutes'

export interface Nudge {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  is_read: boolean
  created_at: string
}

export interface LeaderboardRow {
  rank: number
  prev_rank: number | null
  total: number
  strava_pts: number
  streak_pts: number
  cotw_pts: number
  bonus_pts: number
  last_calculated: string
  season_id: string
  user_id: string
  name: string
  photo_url: string | null
  gender: 'M' | 'F' | null
  strava_url: string | null
  team_id: string | null
  team_name: string | null
  team_color: string | null
}

export interface TeamLeaderboardRow {
  team_id: string
  team_name: string
  color: string
  season_id: string
  total_pts: number
  member_count: number
  rank: number
}
