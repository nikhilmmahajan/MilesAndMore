export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { recalculateUserScore } from '@/lib/scoring/engine'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const {
      activity_id,
      flagged,
    }: { activity_id: string; flagged: boolean } = await req.json()

    const activity = await getOne<{ user_id: string; season_id: string }>(
      `UPDATE strava_activities SET flagged = $1 WHERE id = $2
       RETURNING user_id, season_id`,
      [flagged, activity_id]
    )

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    await recalculateUserScore(activity.user_id, activity.season_id)

    await query(
      `INSERT INTO admin_audit_log (admin_id, action, metadata)
       VALUES ($1, 'activity_flag', $2)`,
      [admin.id, JSON.stringify({ activity_id, flagged })]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
