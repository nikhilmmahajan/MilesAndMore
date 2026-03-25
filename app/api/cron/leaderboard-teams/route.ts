export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOne } from '@/lib/db'
import { recalculateSeasonScores } from '@/lib/scoring/engine'
import type { Season } from '@/lib/types'

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

    await recalculateSeasonScores(season.id)

    return NextResponse.json({ ok: true, at: new Date() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
