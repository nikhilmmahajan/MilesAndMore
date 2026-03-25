export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'

// Dev-only bypass — disabled in production
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Upsert a test admin user
  const user = await getOne<{ id: string }>(
    `INSERT INTO users (strava_id, name, email, gender, is_admin)
     VALUES (9999999, 'Dev Admin', 'dev@almaden.local', 'M', true)
     ON CONFLICT (strava_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    []
  )

  if (!user) {
    return NextResponse.json({ error: 'Could not create dev user' }, { status: 500 })
  }

  // Seed this user into the active season's team so leaderboard works
  const season = await getOne<{ id: string; name: string }>(
    `SELECT id FROM seasons WHERE status = 'active' LIMIT 1`,
    []
  )

  if (season) {
    const team = await getOne<{ id: string }>(
      `SELECT id FROM teams WHERE season_id = $1 LIMIT 1`,
      [season.id]
    )
    if (team) {
      await query(
        `INSERT INTO team_members (team_id, user_id, season_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, season_id) DO NOTHING`,
        [team.id, user.id, season.id]
      )
    }
    await query(
      `INSERT INTO score_cache (user_id, season_id, strava_pts, streak_pts, cotw_pts, bonus_pts, total, rank)
       VALUES ($1, $2, 1540, 350, 240, 100, 2230, 1)
       ON CONFLICT (user_id, season_id) DO NOTHING`,
      [user.id, season.id]
    )
  }

  const headers = new Headers()
  setSessionCookie(user.id, headers)
  headers.set('Location', '/dashboard')
  return new NextResponse(null, { status: 302, headers })
}
