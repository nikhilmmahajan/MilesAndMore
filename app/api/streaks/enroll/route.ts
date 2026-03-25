export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import type { Season } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { track_name, level } = await req.json()

    const season = await getOne<Season>(
      `SELECT * FROM seasons WHERE status = 'active' LIMIT 1`
    )
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 })
    }

    const existing = await getOne(
      `SELECT id FROM streak_enrollments WHERE user_id = $1 AND season_id = $2`,
      [user.id, season.id]
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled in this season' },
        { status: 400 }
      )
    }

    await query(
      `INSERT INTO streak_enrollments (user_id, season_id, track_name, level) VALUES ($1, $2, $3, $4)`,
      [user.id, season.id, track_name, level]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
