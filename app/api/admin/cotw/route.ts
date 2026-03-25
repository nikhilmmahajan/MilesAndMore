export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { CotwChallenge } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const {
      season_id,
      week_start_date,
      title,
      description,
      video_url,
      participation_pts,
      winner_bonus_pts,
      voting_enabled,
      voting_options,
      voting_deadline,
    } = await req.json()

    const challenge = await getOne<CotwChallenge>(
      `INSERT INTO cotw_challenges
         (season_id, week_start_date, title, description, video_url,
          participation_pts, winner_bonus_pts, voting_enabled, voting_options, voting_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        season_id,
        week_start_date,
        title,
        description ?? null,
        video_url ?? null,
        participation_pts,
        winner_bonus_pts ?? 0,
        voting_enabled ?? false,
        JSON.stringify(voting_options ?? []),
        voting_deadline ?? null,
      ]
    )

    return NextResponse.json({ ok: true, challenge })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
