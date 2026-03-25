export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOne, getMany } from '@/lib/db'
import { syncUserActivities } from '@/lib/strava/sync'
import { recalculateSeasonScores } from '@/lib/scoring/engine'
import type { Season } from '@/lib/types'

const BATCH_SIZE = 10
const BATCH_PAUSE_MS = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const season = await getOne<Season>(
      `SELECT * FROM seasons WHERE status = 'active' LIMIT 1`
    )

    if (!season) {
      return NextResponse.json({ ok: true, message: 'no active season' })
    }

    const users = await getMany<{ id: string }>(
      `SELECT id FROM users WHERE strava_access_token IS NOT NULL`
    )

    let synced = 0
    let errors = 0

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            await syncUserActivities(user.id, season.id, season.start_date)
            synced++
          } catch (err) {
            console.error(`Sync failed for user ${user.id}:`, err)
            errors++
          }
        })
      )

      if (i + BATCH_SIZE < users.length) {
        await sleep(BATCH_PAUSE_MS)
      }
    }

    await recalculateSeasonScores(season.id)

    return NextResponse.json({
      synced,
      errors,
      season_id: season.id,
      triggered_recalc: true,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
