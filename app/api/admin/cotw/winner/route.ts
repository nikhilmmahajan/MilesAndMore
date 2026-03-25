export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { recalculateUserScore } from '@/lib/scoring/engine'
import { triggerPulseEvent } from '@/lib/pulse/events'
import type { CotwChallenge, User } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const {
      cotw_id,
      user_id,
      gender,
    }: { cotw_id: string; user_id: string; gender: 'M' | 'F' } =
      await req.json()

    const challenge = await getOne<CotwChallenge>(
      `SELECT * FROM cotw_challenges WHERE id = $1`,
      [cotw_id]
    )
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    await query(
      `INSERT INTO cotw_winners (cotw_id, user_id, gender, admin_id) VALUES ($1, $2, $3, $4)`,
      [cotw_id, user_id, gender, admin.id]
    )

    if (challenge.winner_bonus_pts > 0) {
      await query(
        `INSERT INTO bonus_points (user_id, season_id, week_start_date, points, reason, awarded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user_id,
          challenge.season_id,
          challenge.week_start_date,
          challenge.winner_bonus_pts,
          `COTW Winner: ${challenge.title}`,
          admin.id,
        ]
      )
    }

    const hofCategory =
      gender === 'M' ? 'cotw_weekly_champion_m' : 'cotw_weekly_champion_f'
    await query(
      `INSERT INTO hall_of_fame (season_id, category, user_id, week_start_date)
       VALUES ($1, $2, $3, $4)`,
      [challenge.season_id, hofCategory, user_id, challenge.week_start_date]
    )

    const winner = await getOne<User>(`SELECT * FROM users WHERE id = $1`, [user_id])

    await triggerPulseEvent({
      userId: user_id,
      seasonId: challenge.season_id,
      eventType: 'cotw_winner',
      content: `🏆 ${winner?.name ?? 'Someone'} won this week's COTW — ${challenge.title}!`,
    })

    await recalculateUserScore(user_id, challenge.season_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
