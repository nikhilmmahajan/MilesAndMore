export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOne, query } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { recalculateUserScore } from '@/lib/scoring/engine'
import { triggerPulseEvent } from '@/lib/pulse/events'
import type { Season, StreakEnrollment, TrackConfig } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const {
      week_start_date,
      completed,
      bench_mode = false,
    }: { week_start_date: string; completed: boolean; bench_mode?: boolean } =
      await req.json()

    const season = await getOne<Season>(
      `SELECT * FROM seasons WHERE status = 'active' LIMIT 1`
    )
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 })
    }

    const enrollment = await getOne<StreakEnrollment>(
      `SELECT * FROM streak_enrollments WHERE user_id = $1 AND season_id = $2`,
      [user.id, season.id]
    )
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in streak for this season' },
        { status: 400 }
      )
    }

    if (bench_mode) {
      const benchCount = await getOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM streak_submissions
         WHERE user_id = $1 AND season_id = $2 AND bench_mode = true`,
        [user.id, season.id]
      )
      if (benchCount && parseInt(benchCount.count) >= 2) {
        return NextResponse.json(
          { error: 'Bench mode limit reached (max 2 per season)' },
          { status: 400 }
        )
      }
    }

    const trackConfig = (season.track_config as TrackConfig[]).find(
      (t) => t.name === enrollment.track_name
    )
    const levelConfig = trackConfig?.levels.find(
      (l) => l.label === enrollment.level
    )
    const pointsPerWeek = levelConfig?.points_per_week ?? 0

    const isCompleted = bench_mode ? false : completed
    const pointsAwarded = isCompleted ? pointsPerWeek : 0

    await query(
      `INSERT INTO streak_submissions
         (user_id, season_id, week_start_date, completed, points_awarded, bench_mode)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, season_id, week_start_date) DO UPDATE SET
         completed = EXCLUDED.completed,
         points_awarded = EXCLUDED.points_awarded,
         bench_mode = EXCLUDED.bench_mode`,
      [user.id, season.id, week_start_date, isCompleted, pointsAwarded, bench_mode]
    )

    await recalculateUserScore(user.id, season.id)

    if (isCompleted) {
      await triggerPulseEvent({
        userId: user.id,
        seasonId: season.id,
        eventType: 'streak_complete',
        content: `${user.name} confirmed their streak — another week done! 💪`,
      })
    }

    return NextResponse.json({ ok: true, points_awarded: pointsAwarded })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
