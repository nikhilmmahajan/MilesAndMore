import { getMany, getOne, query } from '@/lib/db'
import { refreshToken } from './oauth'
import { normaliseActivityType } from '@/lib/utils'
import { format, startOfISOWeek } from 'date-fns'

interface StravaActivity {
  id: number
  sport_type?: string
  type?: string
  moving_time: number
  distance: number
  total_elevation_gain: number
  start_date: string
  start_latlng?: [number, number]
}

export async function syncUserActivities(userId: string, seasonId: string, seasonStartDate: string): Promise<{ synced: number; error?: string }> {
  const user = await getOne<{
    strava_access_token: string
    strava_refresh_token: string
    strava_token_expires_at: string
    last_synced_at: string | null
  }>('SELECT strava_access_token, strava_refresh_token, strava_token_expires_at, last_synced_at FROM users WHERE id = $1', [userId])

  if (!user?.strava_access_token) return { synced: 0, error: 'no_token' }

  let accessToken = user.strava_access_token

  // Refresh if expiring within 5 minutes
  const expiresAt = new Date(user.strava_token_expires_at)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshToken(user.strava_refresh_token)
      accessToken = refreshed.access_token
      await query(
        `UPDATE users SET strava_access_token = $1, strava_refresh_token = $2, strava_token_expires_at = to_timestamp($3) WHERE id = $4`,
        [refreshed.access_token, refreshed.refresh_token, refreshed.expires_at, userId]
      )
    } catch {
      return { synced: 0, error: 'token_refresh_failed' }
    }
  }

  const after = user.last_synced_at
    ? Math.floor(new Date(user.last_synced_at).getTime() / 1000)
    : Math.floor(new Date(seasonStartDate).getTime() / 1000)

  const activities: StravaActivity[] = []
  for (let page = 1; page <= 2; page++) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) break
    const batch: StravaActivity[] = await res.json()
    if (!batch.length) break
    activities.push(...batch)
    if (batch.length < 100) break
  }

  let synced = 0
  for (const act of activities.slice(0, 200)) {
    const weekStart = format(startOfISOWeek(new Date(act.start_date)), 'yyyy-MM-dd')
    const actType = normaliseActivityType(act.sport_type ?? act.type ?? 'Other')
    const lat = act.start_latlng?.[0] ?? null
    const lng = act.start_latlng?.[1] ?? null

    try {
      await query(
        `INSERT INTO strava_activities
           (user_id, season_id, strava_activity_id, week_start_date, duration_minutes,
            distance_km, elevation_gain_m, activity_type, source, start_lat, start_lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'strava_sync', $9, $10)
         ON CONFLICT (strava_activity_id) WHERE strava_activity_id IS NOT NULL DO NOTHING`,
        [
          userId, seasonId, act.id, weekStart,
          Math.floor(act.moving_time / 60),
          act.distance ? act.distance / 1000 : null,
          act.total_elevation_gain ?? null,
          actType, lat, lng,
        ]
      )
      synced++
    } catch { /* skip duplicate */ }
  }

  await query('UPDATE users SET last_synced_at = now() WHERE id = $1', [userId])
  return { synced }
}
