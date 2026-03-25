export const dynamic = 'force-dynamic'
import { requireUser } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import { getMondayString } from '@/lib/utils'
import type { Season, StreakEnrollment, StreakSubmission } from '@/lib/types'
import { EnrollmentForm } from '@/components/streaks/EnrollmentForm'
import { WeeklySubmission } from '@/components/streaks/WeeklySubmission'
import { StreakCalendar } from '@/components/streaks/StreakCalendar'

export default async function StreaksPage() {
  const user = await requireUser()

  const season = await getOne<Season>(
    "SELECT * FROM seasons WHERE status = 'active' LIMIT 1"
  )

  if (!season) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        No active season found.
      </div>
    )
  }

  const enrollment = await getOne<StreakEnrollment>(
    'SELECT * FROM streak_enrollments WHERE user_id = $1 AND season_id = $2',
    [user.id, season.id]
  )

  const submissions = await getMany<StreakSubmission>(
    'SELECT * FROM streak_submissions WHERE user_id = $1 AND season_id = $2 ORDER BY week_start_date ASC',
    [user.id, season.id]
  )

  const benchRow = await getOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM streak_submissions WHERE user_id = $1 AND season_id = $2 AND bench_mode = true',
    [user.id, season.id]
  )
  const benchCount = parseInt(benchRow?.count ?? '0', 10)

  const currentWeekStart = getMondayString()
  const currentWeekSub = submissions.find((s) => s.week_start_date === currentWeekStart) ?? null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Consistency Streaks</h2>
        <p className="text-sm text-gray-400">{season.name}</p>
      </div>

      <EnrollmentForm season={season} enrollment={enrollment} />

      {enrollment && (
        <WeeklySubmission
          enrollment={enrollment}
          currentSubmission={currentWeekSub}
          benchCount={benchCount}
          seasonId={season.id}
          onSuccess={() => {}}
        />
      )}

      {submissions.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Your Season Streak</h3>
          <StreakCalendar submissions={submissions} />
        </div>
      )}
    </div>
  )
}
