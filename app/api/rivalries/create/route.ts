export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { triggerPulseEvent } from '@/lib/pulse/events'
import type { Season, User } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { opponent_id }: { opponent_id: string } = await req.json()

    const season = await getOne<Season>(
      `SELECT * FROM seasons WHERE status = 'active' LIMIT 1`
    )
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 })
    }

    const existing = await getOne(
      `SELECT id FROM rivalries
       WHERE challenger_id = $1 AND opponent_id = $2 AND season_id = $3`,
      [user.id, opponent_id, season.id]
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Rivalry already exists' },
        { status: 400 }
      )
    }

    const rivalry = await getOne(
      `INSERT INTO rivalries (challenger_id, opponent_id, season_id, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [user.id, opponent_id, season.id]
    )

    const opponent = await getOne<User>(
      `SELECT * FROM users WHERE id = $1`,
      [opponent_id]
    )

    await triggerPulseEvent({
      userId: user.id,
      seasonId: season.id,
      eventType: 'rivalry_started',
      content: `⚔️ ${user.name} has challenged ${opponent?.name ?? 'someone'} to a head-to-head rivalry!`,
    })

    return NextResponse.json({ ok: true, rivalry })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
