import { query, getMany, getOne } from '@/lib/db'

export async function recalculateUserScore(userId: string, seasonId: string): Promise<void> {
  const [strava, streak, cotw, bonus] = await Promise.all([
    getOne<{ pts: string }>(
      `SELECT COALESCE(SUM(duration_minutes), 0) AS pts
       FROM strava_activities
       WHERE user_id = $1 AND season_id = $2 AND flagged = false`,
      [userId, seasonId]
    ),
    getOne<{ pts: string }>(
      `SELECT COALESCE(SUM(points_awarded), 0) AS pts
       FROM streak_submissions
       WHERE user_id = $1 AND season_id = $2`,
      [userId, seasonId]
    ),
    getOne<{ pts: string }>(
      `SELECT COALESCE(SUM(cs.points_awarded), 0) AS pts
       FROM cotw_submissions cs
       JOIN cotw_challenges cc ON cs.cotw_id = cc.id
       WHERE cs.user_id = $1 AND cc.season_id = $2`,
      [userId, seasonId]
    ),
    getOne<{ pts: string }>(
      `SELECT COALESCE(SUM(points), 0) AS pts
       FROM bonus_points
       WHERE user_id = $1 AND season_id = $2`,
      [userId, seasonId]
    ),
  ])

  const stravaPts = parseInt(strava?.pts ?? '0')
  const streakPts = parseInt(streak?.pts ?? '0')
  const cotwPts = parseInt(cotw?.pts ?? '0')
  const bonusPts = parseInt(bonus?.pts ?? '0')
  const total = stravaPts + streakPts + cotwPts + bonusPts

  await query(
    `INSERT INTO score_cache (user_id, season_id, strava_pts, streak_pts, cotw_pts, bonus_pts, total, last_calculated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id, season_id) DO UPDATE SET
       strava_pts = EXCLUDED.strava_pts,
       streak_pts = EXCLUDED.streak_pts,
       cotw_pts = EXCLUDED.cotw_pts,
       bonus_pts = EXCLUDED.bonus_pts,
       total = EXCLUDED.total,
       prev_rank = score_cache.rank,
       last_calculated = now()`,
    [userId, seasonId, stravaPts, streakPts, cotwPts, bonusPts, total]
  )

  await reassignRanks(seasonId)
}

export async function recalculateSeasonScores(seasonId: string): Promise<number> {
  const users = await getMany<{ user_id: string }>(
    'SELECT user_id FROM team_members WHERE season_id = $1',
    [seasonId]
  )

  await Promise.all(users.map((u) => recalculateUserScore(u.user_id, seasonId)))
  return users.length
}

async function reassignRanks(seasonId: string): Promise<void> {
  await query(
    `UPDATE score_cache sc
     SET rank = ranked.new_rank
     FROM (
       SELECT user_id, ROW_NUMBER() OVER (ORDER BY total DESC) AS new_rank
       FROM score_cache WHERE season_id = $1
     ) AS ranked
     WHERE sc.user_id = ranked.user_id AND sc.season_id = $1`,
    [seasonId]
  )
}
