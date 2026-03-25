export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMany } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { StravaActivity } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = req.nextUrl
    const userId = searchParams.get('user_id')
    const seasonId = searchParams.get('season_id')

    if (!userId || !seasonId) {
      return NextResponse.json(
        { error: 'user_id and season_id required' },
        { status: 400 }
      )
    }

    const activities = await getMany<StravaActivity>(
      `SELECT * FROM strava_activities
       WHERE user_id = $1 AND season_id = $2
       ORDER BY created_at DESC`,
      [userId, seasonId]
    )

    return NextResponse.json({ activities })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
