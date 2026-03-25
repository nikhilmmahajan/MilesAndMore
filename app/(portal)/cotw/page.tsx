export const dynamic = 'force-dynamic'
import { format, startOfISOWeek } from 'date-fns'
import { requireUser } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import type { Season, CotwChallenge, CotwSubmission, CotwWinner } from '@/lib/types'
import { ChallengeCard } from '@/components/cotw/ChallengeCard'

type WinnerWithUser = CotwWinner & {
  user: { name: string; photo_url: string | null }
}

type SubmissionCount = {
  full_form: number
  assisted: number
  did_not_do: number
}

type PastChallenge = {
  id: string
  title: string
  week_start_date: string
}

export default async function CotwPage() {
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

  const currentWeekStart = format(startOfISOWeek(new Date()), 'yyyy-MM-dd')

  const challenge = await getOne<CotwChallenge>(
    'SELECT * FROM cotw_challenges WHERE season_id = $1 AND week_start_date = $2',
    [season.id, currentWeekStart]
  )

  if (!challenge) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Challenge of the Week</h2>
          <p className="text-sm text-gray-400">{season.name}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
          <span className="text-4xl">⏳</span>
          <p>No challenge posted for this week yet.</p>
        </div>
      </div>
    )
  }

  const userSub = await getOne<CotwSubmission>(
    'SELECT * FROM cotw_submissions WHERE user_id = $1 AND cotw_id = $2',
    [user.id, challenge.id]
  )

  const winnersRaw = await getMany<WinnerWithUser>(
    `SELECT cw.*, u.name AS "user_name", u.photo_url AS "user_photo_url"
     FROM cotw_winners cw
     JOIN users u ON u.id = cw.user_id
     WHERE cw.cotw_id = $1`,
    [challenge.id]
  )

  const winners: WinnerWithUser[] = winnersRaw.map((w: any) => ({
    ...w,
    user: { name: w.user_name, photo_url: w.user_photo_url },
  }))

  const countRows = await getMany<{ participation: string; count: string }>(
    `SELECT participation, COUNT(*) as count
     FROM cotw_submissions
     WHERE cotw_id = $1
     GROUP BY participation`,
    [challenge.id]
  )

  const counts: SubmissionCount = { full_form: 0, assisted: 0, did_not_do: 0 }
  for (const row of countRows) {
    const key = row.participation as keyof SubmissionCount
    if (key in counts) counts[key] = parseInt(row.count, 10)
  }

  const pastChallenges = await getMany<PastChallenge>(
    `SELECT id, title, week_start_date
     FROM cotw_challenges
     WHERE season_id = $1 AND week_start_date < $2
     ORDER BY week_start_date DESC
     LIMIT 8`,
    [season.id, currentWeekStart]
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Challenge of the Week</h2>
        <p className="text-sm text-gray-400">{season.name}</p>
      </div>

      <ChallengeCard
        challenge={challenge}
        submission={userSub}
        winners={winners}
        submissionCount={counts}
      />

      {pastChallenges.length > 0 && (
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer font-medium text-white mb-2">
            Past Challenges
          </summary>
          <div className="mt-2 rounded-lg border border-brand-accent overflow-hidden">
            {pastChallenges.map((c) => (
              <div
                key={c.id}
                className="flex justify-between px-4 py-2 border-b border-brand-accent last:border-b-0 hover:bg-brand-accent/30 transition-colors"
              >
                <span className="text-white">{c.title}</span>
                <span className="text-gray-500 shrink-0 ml-4">
                  {formatDate(c.week_start_date)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
