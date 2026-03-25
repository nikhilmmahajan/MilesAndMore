export const dynamic = 'force-dynamic'
import { requireUser } from '@/lib/auth'
import { getOne, getMany } from '@/lib/db'
import { cn, formatScore } from '@/lib/utils'
import type { Season, ScoreCache, StravaActivity } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreProgressChart } from '@/components/charts/ScoreProgressChart'
import { ActivityDonutChart } from '@/components/charts/ActivityDonutChart'
import { ActivityBarChart } from '@/components/charts/ActivityBarChart'

interface CotwStat {
  participated: string
}

interface CotwTotal {
  total: string
}

export default async function DashboardPage() {
  const user = await requireUser()

  const season = await getOne<Season>(
    `SELECT * FROM seasons WHERE status = 'active' LIMIT 1`
  )

  const score = season
    ? await getOne<ScoreCache>(
        `SELECT * FROM score_cache WHERE user_id = $1 AND season_id = $2`,
        [user.id, season.id]
      )
    : null

  const activities = season
    ? await getMany<StravaActivity>(
        `SELECT * FROM strava_activities WHERE user_id = $1 AND season_id = $2 AND flagged = false ORDER BY week_start_date ASC`,
        [user.id, season.id]
      )
    : []

  const cotwStat = season
    ? await getOne<CotwStat>(
        `SELECT COUNT(*) as participated FROM cotw_submissions cs
         JOIN cotw_challenges cc ON cs.cotw_id = cc.id
         WHERE cs.user_id = $1 AND cc.season_id = $2 AND cs.participation != 'did_not_do'`,
        [user.id, season.id]
      )
    : null

  const cotwTotal = season
    ? await getOne<CotwTotal>(
        `SELECT COUNT(*) as total FROM cotw_challenges WHERE season_id = $1`,
        [season.id]
      )
    : null

  const cotwParticipated = Number(cotwStat?.participated ?? 0)
  const totalCotwWeeks = Number(cotwTotal?.total ?? 0)

  // Build progress chart data: group by week, compute cumulative total
  const weekMap: Map<string, { minutes: number; pts: number }> = new Map()
  for (const act of activities) {
    const week = act.week_start_date.slice(0, 10)
    const existing = weekMap.get(week) ?? { minutes: 0, pts: 0 }
    weekMap.set(week, {
      minutes: existing.minutes + (act.duration_minutes ?? 0),
      pts: existing.pts,
    })
  }

  let cumulative = 0
  const progressData = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { minutes }]) => {
      cumulative += minutes
      return {
        week: week.slice(5), // "MM-DD"
        cumulative,
        minutes,
      }
    })

  // Activity mix: group by activity_type, sum minutes
  const mixMap: Map<string, number> = new Map()
  for (const act of activities) {
    const type = act.activity_type
    mixMap.set(type, (mixMap.get(type) ?? 0) + (act.duration_minutes ?? 0))
  }
  const activityMix = Array.from(mixMap.entries())
    .map(([type, minutes]) => ({ type, minutes }))
    .sort((a, b) => b.minutes - a.minutes)

  return (
    <div className="space-y-6">
      {/* User header */}
      <div className="flex items-center gap-4">
        <img
          src={user.photo_url ?? '/icons/default-avatar.png'}
          alt={user.name}
          className="w-14 h-14 rounded-full border-2 border-brand-orange object-cover"
        />
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-sm text-gray-400">{season?.name ?? 'Season'}</p>
        </div>
        <div className="ml-auto font-mono text-3xl text-brand-orange font-bold">
          #{score?.rank ?? '—'}
        </div>
      </div>

      {/* Score breakdown card */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Strava', pts: score?.strava_pts ?? 0, color: 'text-blue-400' },
            { label: 'Streak', pts: score?.streak_pts ?? 0, color: 'text-green-400' },
            { label: 'COTW', pts: score?.cotw_pts ?? 0, color: 'text-purple-400' },
            { label: 'Bonus', pts: score?.bonus_pts ?? 0, color: 'text-brand-gold' },
          ].map(({ label, pts, color }) => (
            <div key={label} className="text-center">
              <p className={cn('font-mono text-2xl font-bold', color)}>{formatScore(pts)}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </CardContent>
        <div className="border-t border-brand-accent mx-4 pb-4 pt-3 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="font-mono text-2xl text-brand-orange font-bold">
            {formatScore(score?.total ?? 0)} pts
          </span>
        </div>
      </Card>

      {/* Point Progression Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Point Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreProgressChart data={progressData} />
        </CardContent>
      </Card>

      {/* Activity charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityDonutChart data={activityMix} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Minutes by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={activityMix} />
          </CardContent>
        </Card>
      </div>

      {/* COTW participation summary */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-400 mb-2">COTW Participation</p>
          <p className="font-mono text-lg">
            {cotwParticipated} of {totalCotwWeeks} challenges
          </p>
          <div className="w-full bg-brand-accent rounded-full h-2 mt-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{
                width: `${totalCotwWeeks > 0 ? (cotwParticipated / totalCotwWeeks) * 100 : 0}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
