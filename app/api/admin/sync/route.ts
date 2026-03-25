export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getMany, getOne } from '@/lib/db'
import { syncUserActivities } from '@/lib/strava/sync'
import { recalculateSeasonScores } from '@/lib/scoring/engine'

export async function POST() {
  try {
    await requireAdmin()

    const season = await getOne<{ id: string; start_date: string }>(
      'SELECT * FROM seasons WHERE status = $1 LIMIT 1',
      ['active']
    )
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 })
    }

    const users = await getMany<{ id: string }>(
      'SELECT id FROM users WHERE strava_access_token IS NOT NULL',
      []
    )

    let synced = 0
    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10)
      await Promise.all(batch.map((u) => syncUserActivities(u.id, season.id, season.start_date)))
      synced += batch.length
      if (i + 10 < users.length) await new Promise((r) => setTimeout(r, 500))
    }

    await recalculateSeasonScores(season.id)

    return NextResponse.json({ ok: true, synced })
  } catch (err) {
    console.error('[admin/sync]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
