export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMany, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { recalculateUserScore } from '@/lib/scoring/engine'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const {
      user_id,
      team_id,
      season_id,
      week_start_date,
      points,
      reason,
    }: {
      user_id?: string
      team_id?: string
      season_id: string
      week_start_date: string
      points: number
      reason: string
    } = await req.json()

    const affectedUserIds: string[] = []

    if (team_id) {
      const members = await getMany<{ user_id: string }>(
        `SELECT user_id FROM team_members WHERE team_id = $1 AND season_id = $2`,
        [team_id, season_id]
      )
      const perMemberPoints =
        members.length > 0 ? Math.floor(points / members.length) : 0

      for (const member of members) {
        await query(
          `INSERT INTO bonus_points (user_id, team_id, season_id, week_start_date, points, reason, awarded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            member.user_id,
            team_id,
            season_id,
            week_start_date,
            perMemberPoints,
            reason,
            admin.id,
          ]
        )
        affectedUserIds.push(member.user_id)
      }
    } else if (user_id) {
      await query(
        `INSERT INTO bonus_points (user_id, season_id, week_start_date, points, reason, awarded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id, season_id, week_start_date, points, reason, admin.id]
      )
      affectedUserIds.push(user_id)
    } else {
      return NextResponse.json(
        { error: 'user_id or team_id required' },
        { status: 400 }
      )
    }

    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, metadata)
       VALUES ($1, 'bonus_awarded', $2, $3)`,
      [
        admin.id,
        user_id ?? null,
        JSON.stringify({ team_id, season_id, points, reason }),
      ]
    )

    await Promise.all(
      affectedUserIds.map((uid) => recalculateUserScore(uid, season_id))
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
